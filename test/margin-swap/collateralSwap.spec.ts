import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber, constants } from 'ethers';
import { ethers, network } from 'hardhat'
import { ImplementationProvider, ImplementationProvider__factory, ProxyDeployer, ProxyDeployer__factory, MoneyMarketDataProvider, MoneyMarketDataProvider__factory, MarginAccountProxy__factory, ERC20Mock, MarginTrader, MarginTrader__factory, UniswapV3Pool__factory, UniswapV3Pool, MarginTradeDataProvider__factory, MarginTradeDataProvider } from '../../types';
import { FeeAmount, TICK_SPACINGS } from '../uniswap-v3/periphery/shared/constants';
import { encodePriceSqrt } from '../uniswap-v3/periphery/shared/encodePriceSqrt';
import { expandTo18Decimals } from '../uniswap-v3/periphery/shared/expandTo18Decimals';
import { getMaxTick, getMinTick } from '../uniswap-v3/periphery/shared/ticks';
import { CompoundFixture, CompoundOptions, generateCompoundFixture } from './shared/compoundFixture';
import { expect } from './shared/expect'
import { ONE_18 } from './shared/marginSwapFixtures';
import { uniswapFixture, UniswapFixture } from './shared/uniswapFixture';


// we prepare a setup for compound in hardhat
// this series of tests checks that the features used for the margin swap implementation
// are correclty set up and working
describe('Collateral Swap operations', async () => {
    let deployer: SignerWithAddress, alice: SignerWithAddress, bob: SignerWithAddress, carol: SignerWithAddress;
    let proxyDeployer: ProxyDeployer
    let logicProvider: ImplementationProvider
    let logic: MarginTrader
    let dataProvider: MarginTradeDataProvider
    let uniswap: UniswapFixture
    let compound: CompoundFixture
    let opts: CompoundOptions
    let accountAlice: MarginTrader
    let protocolId = 0

    const liquidity = 1000000
    async function createPool(tokenAddressA: string, tokenAddressB: string) {
        if (tokenAddressA.toLowerCase() > tokenAddressB.toLowerCase())
            [tokenAddressA, tokenAddressB] = [tokenAddressB, tokenAddressA]

        await uniswap.nft.createAndInitializePoolIfNecessary(
            tokenAddressA,
            tokenAddressB,
            FeeAmount.MEDIUM,
            encodePriceSqrt(1, 1)
        )

        const liquidityParams = {
            token0: tokenAddressA,
            token1: tokenAddressB,
            fee: FeeAmount.MEDIUM,
            tickLower: getMinTick(TICK_SPACINGS[FeeAmount.MEDIUM]),
            tickUpper: getMaxTick(TICK_SPACINGS[FeeAmount.MEDIUM]),
            recipient: deployer.address,
            amount0Desired: 1000000,
            amount1Desired: 1000000,
            amount0Min: 0,
            amount1Min: 0,
            deadline: 1,
        }

        return uniswap.nft.mint(liquidityParams)
    }

    async function addLiquidity(tokenAddressA: string, tokenAddressB: string, amountA: BigNumber, amountB: BigNumber) {
        if (tokenAddressA.toLowerCase() > tokenAddressB.toLowerCase())
            [tokenAddressA, tokenAddressB, amountA, amountB] = [tokenAddressB, tokenAddressA, amountB, amountA]

        await uniswap.nft.createAndInitializePoolIfNecessary(
            tokenAddressA,
            tokenAddressB,
            FeeAmount.MEDIUM,
            encodePriceSqrt(1, 1)
        )

        const liquidityParams = {
            token0: tokenAddressA,
            token1: tokenAddressB,
            fee: FeeAmount.MEDIUM,
            tickLower: getMinTick(TICK_SPACINGS[FeeAmount.MEDIUM]),
            tickUpper: getMaxTick(TICK_SPACINGS[FeeAmount.MEDIUM]),
            recipient: deployer.address,
            amount0Desired: amountA,
            amount1Desired: amountB,
            amount0Min: 0,
            amount1Min: 0,
            deadline: 1,
        }

        return uniswap.nft.mint(liquidityParams)
    }


    async function createPoolWETH9(tokenAddress: string) {
        await uniswap.weth9.deposit({ value: liquidity })
        await uniswap.weth9.approve(uniswap.nft.address, constants.MaxUint256)
        return createPool(uniswap.weth9.address, tokenAddress)
    }

    async function getOperatorContract(acc: string) {
        return await new ethers.Contract(acc, MarginTrader__factory.createInterface()) as MarginTrader
    }

    async function feedCompound() {
        await proxyDeployer.connect(alice).createAccount(alice.address)
        const accounts = await proxyDeployer.getAccounts(alice.address)
        console.log(accounts)
        accountAlice = await getOperatorContract(accounts[0])
        await accountAlice.connect(alice).approveUnderlyings(uniswap.tokens.map(t => t.address), protocolId)


        for (let i = 0; i < uniswap.tokens.length; i++) {
            const tok = uniswap.tokens[i]
            const cTok = compound.cTokens[i]
            await tok.connect(deployer).approve(cTok.address, constants.MaxUint256)
            await cTok.connect(deployer).mint(expandTo18Decimals(1_000_000))

        }

    }

    async function feedProvider() {
        for (let i = 0; i < uniswap.tokens.length; i++) {
            await dataProvider.addCToken(uniswap.tokens[i].address, protocolId, compound.cTokens[i].address)
        }
    }

    async function supplyToCompound(
        signer: SignerWithAddress,
        account: MarginTrader,
        index: number,
        amount: BigNumber
    ) {
        const supply_underlying = uniswap.tokens[index]
        await supply_underlying.connect(signer).approve(account.address, constants.MaxUint256)
        await account.connect(signer).mint(supply_underlying.address, protocolId, amount)
    }

    async function redeemUnderlyingFromCompound(
        signer: SignerWithAddress,
        account: MarginTrader,
        index: number,
        amount: BigNumber
    ) {
        const supply_underlying = uniswap.tokens[index]
        await supply_underlying.connect(signer).approve(account.address, constants.MaxUint256)
        await account.connect(signer).redeemUnderlying(supply_underlying.address, protocolId, amount)
    }



    async function borrowFromCompound(
        signer: SignerWithAddress,
        account: MarginTrader,
        index: number,
        amount: BigNumber
    ) {
        const borrow_underlying = uniswap.tokens[index]
        await account.connect(signer).borrow(borrow_underlying.address, protocolId, amount)
    }

    async function repayBorrowToCompound(
        signer: SignerWithAddress,
        account: MarginTrader,
        index: number,
        amount: BigNumber
    ) {
        const borrow_underlying = uniswap.tokens[index]
        await borrow_underlying.connect(signer).approve(accountAlice.address, constants.MaxUint256)
        await account.connect(signer).approveUnderlyings([borrow_underlying.address], protocolId)
        await account.connect(signer).repayBorrow(borrow_underlying.address, protocolId, amount)
    }



    beforeEach('Deploy Account, Trader, Uniswap and Compound', async () => {
        [deployer, alice, bob, carol] = await ethers.getSigners();
        proxyDeployer = await new ProxyDeployer__factory(deployer).deploy()
        logic = await new MarginTrader__factory(deployer).deploy()
        logicProvider = await new ImplementationProvider__factory(deployer).deploy(logic.address)
        dataProvider = await new MarginTradeDataProvider__factory(deployer).deploy()
        await proxyDeployer.initialize(logicProvider.address, dataProvider.address)
        uniswap = await uniswapFixture(deployer, 5)
        opts = {
            underlyings: uniswap.tokens,
            collateralFactors: uniswap.tokens.map(x => ONE_18.mul(5).div(10)),
            exchangeRates: uniswap.tokens.map(x => ONE_18),
            borrowRates: uniswap.tokens.map(x => ONE_18),
            cEthExchangeRate: ONE_18,
            cEthBorrowRate: ONE_18,
            compRate: ONE_18,
            closeFactor: ONE_18
        }

        beforeEach('create 0-1 and 1-2 pools', async () => {
            await createPool(uniswap.tokens[0].address, uniswap.tokens[1].address)
            await createPool(uniswap.tokens[1].address, uniswap.tokens[2].address)
            await createPoolWETH9(uniswap.tokens[0].address)
        })

        // approve & fund wallets
        for (const token of uniswap.tokens) {
            await token.approve(uniswap.router.address, constants.MaxUint256)
            await token.approve(uniswap.nft.address, constants.MaxUint256)

            await token.connect(bob).approve(uniswap.router.address, constants.MaxUint256)
            await token.connect(bob).approve(uniswap.nft.address, constants.MaxUint256)
            await token.connect(alice).approve(uniswap.router.address, constants.MaxUint256)
            await token.connect(alice).approve(uniswap.nft.address, constants.MaxUint256)
            await token.connect(carol).approve(uniswap.router.address, constants.MaxUint256)
            await token.connect(carol).approve(uniswap.nft.address, constants.MaxUint256)

            await token.connect(bob).approve(uniswap.router.address, constants.MaxUint256)
            await token.connect(alice).approve(uniswap.router.address, constants.MaxUint256)
            await token.connect(carol).approve(uniswap.router.address, constants.MaxUint256)

            await token.connect(deployer).transfer(bob.address, expandTo18Decimals(1_000_000))
            await token.connect(deployer).transfer(alice.address, expandTo18Decimals(1_000_000))
            await token.connect(deployer).transfer(carol.address, expandTo18Decimals(1_000_000))

            await token.connect(deployer).approve(uniswap.router.address, constants.MaxUint256)
            await token.connect(bob).approve(uniswap.router.address, constants.MaxUint256)
            await token.connect(carol).approve(uniswap.router.address, constants.MaxUint256)
            await token.connect(alice).approve(uniswap.router.address, constants.MaxUint256)
        }

        compound = await generateCompoundFixture(deployer, opts)

        await dataProvider.addComptroller(protocolId, compound.comptroller.address)

    })

    it('allows loan swap borrow exact in', async () => {
        await feedProvider()
        await feedCompound()
        const supplyAmount = expandTo18Decimals(1_000)
        const supplyTokenIndex = 1
        const borrowAmount_0 = expandTo18Decimals(100)
        const borrowTokenIndex_0 = 0

        const borrowAmount_1 = expandTo18Decimals(100)
        const borrowTokenIndex_1 = 2

        await supplyToCompound(alice, accountAlice, supplyTokenIndex, supplyAmount)

        // enter merket
        await accountAlice.connect(alice).enterMarkets(protocolId, compound.cTokens.map(cT => cT.address))

        await borrowFromCompound(alice, accountAlice, borrowTokenIndex_0, borrowAmount_0)

        await network.provider.send("evm_increaseTime", [3600])
        await network.provider.send("evm_mine")

        await borrowFromCompound(alice, accountAlice, borrowTokenIndex_1, borrowAmount_1)

        const swapAmount = expandTo18Decimals(50)

        await addLiquidity(uniswap.tokens[0].address, uniswap.tokens[2].address, expandTo18Decimals(10_000), expandTo18Decimals(10_000))
        const poolAddress = await uniswap.factory.getPool(uniswap.tokens[2].address, uniswap.tokens[0].address, FeeAmount.MEDIUM)



        const pool = await new ethers.Contract(poolAddress, UniswapV3Pool__factory.createInterface(), deployer) as UniswapV3Pool

        console.log("Check", poolAddress)
        const fee = await pool.connect(alice).fee()
        console.log("FE", fee)

        // add pool
        await dataProvider.addV3Pool(uniswap.tokens[0].address, uniswap.tokens[2].address, poolAddress)


        const p = await dataProvider.getV3Pool(uniswap.tokens[0].address, uniswap.tokens[2].address, 0)
        console.log("RET", p)
        const params = {
            tokenIn: uniswap.tokens[borrowTokenIndex_0].address,
            tokenOut: uniswap.tokens[borrowTokenIndex_1].address,
            fee: FeeAmount.MEDIUM,
            amountIn: swapAmount,
            amountOutMinimum: constants.MaxUint256,
            sqrtPriceLimitX96: '0'
        }
        console.log("DATA", accountAlice.address, poolAddress)
        await accountAlice.connect(alice).swapBorrowExactIn(protocolId, params)

        const borrow0 = await compound.cTokens[borrowTokenIndex_0].borrowBalanceStored(accountAlice.address)
        const borrow1 = await compound.cTokens[borrowTokenIndex_1].borrowBalanceStored(accountAlice.address)

        console.log(borrow0.toString(), borrow1.toString())

        expect(borrow0.toString()).to.equal(borrowAmount_0.add(swapAmount).toString())
        // expect(borrow1.toString()).to.be.(borrowAmount_1.sub(swapAmount).toString())
    })

    it('allows loan swap borrow exact out', async () => {
        await feedProvider()
        await feedCompound()
        const supplyAmount = expandTo18Decimals(1_000)
        const supplyTokenIndex = 1
        const borrowAmount_0 = expandTo18Decimals(230)
        const borrowTokenIndex_0 = 0

        const borrowAmount_1 = expandTo18Decimals(230)
        const borrowTokenIndex_1 = 2

        await supplyToCompound(alice, accountAlice, supplyTokenIndex, supplyAmount)

        // enter merket
        await accountAlice.connect(alice).enterMarkets(protocolId, compound.cTokens.map(cT => cT.address))

        await borrowFromCompound(alice, accountAlice, borrowTokenIndex_0, borrowAmount_0)

        await network.provider.send("evm_increaseTime", [3600])
        await network.provider.send("evm_mine")

        await borrowFromCompound(alice, accountAlice, borrowTokenIndex_1, borrowAmount_1)

        const swapAmount = expandTo18Decimals(150)

        await addLiquidity(uniswap.tokens[0].address, uniswap.tokens[2].address, expandTo18Decimals(10_000), expandTo18Decimals(10_000))
        const poolAddress = await uniswap.factory.getPool(uniswap.tokens[2].address, uniswap.tokens[0].address, FeeAmount.MEDIUM)



        const pool = await new ethers.Contract(poolAddress, UniswapV3Pool__factory.createInterface(), deployer) as UniswapV3Pool

        console.log("Check", poolAddress)
        const fee = await pool.connect(alice).fee()
        console.log("FE", fee)

        // add pool
        await dataProvider.addV3Pool(uniswap.tokens[0].address, uniswap.tokens[2].address, poolAddress)


        const p = await dataProvider.getV3Pool(uniswap.tokens[0].address, uniswap.tokens[2].address, 0)
        console.log("RET", p)
        const params = {
            tokenIn: uniswap.tokens[borrowTokenIndex_0].address,
            tokenOut: uniswap.tokens[borrowTokenIndex_1].address,
            fee: FeeAmount.MEDIUM,
            amountOut: swapAmount,
            amountInMaximum: constants.MaxUint256,
            sqrtPriceLimitX96: '0'
        }
        console.log("DATA", accountAlice.address, poolAddress)
        await accountAlice.connect(alice).swapBorrowExactOut(protocolId, params)

        const borrow0 = await compound.cTokens[borrowTokenIndex_0].borrowBalanceStored(accountAlice.address)
        const borrow1 = await compound.cTokens[borrowTokenIndex_1].borrowBalanceStored(accountAlice.address)

        console.log(borrow0.toString(), borrow1.toString())

        expect(borrow1.toString()).to.equal(borrowAmount_1.sub(swapAmount).toString())
        // expect(borrow1.toString()).to.be.(borrowAmount_1.sub(swapAmount).toString())
    })

    it('allows collateral swap borrow exact out', async () => {
        await feedProvider()
        await feedCompound()
        const supplyAmount = expandTo18Decimals(1_000)
        const supplyTokenIndex_0 = 1
        const supplyTokenIndex_1 = 2
        const borrowAmount = expandTo18Decimals(400)
        const borrowTokenIndex = 0

        await supplyToCompound(alice, accountAlice, supplyTokenIndex_0, supplyAmount)

        // enter merket
        await accountAlice.connect(alice).enterMarkets(protocolId, compound.cTokens.map(cT => cT.address))

        await borrowFromCompound(alice, accountAlice, borrowTokenIndex, borrowAmount)

        await network.provider.send("evm_increaseTime", [3600])
        await network.provider.send("evm_mine")

        const swapAmount = expandTo18Decimals(900)

        await addLiquidity(
            uniswap.tokens[supplyTokenIndex_0].address, 
            uniswap.tokens[supplyTokenIndex_1].address, 
            expandTo18Decimals(10_000), 
            expandTo18Decimals(10_000)
            )

        const poolAddress = await uniswap.factory.getPool(uniswap.tokens[supplyTokenIndex_0].address, uniswap.tokens[supplyTokenIndex_1].address, FeeAmount.MEDIUM)



        const pool = await new ethers.Contract(poolAddress, UniswapV3Pool__factory.createInterface(), deployer) as UniswapV3Pool

        console.log("Check", poolAddress)
        const fee = await pool.connect(alice).fee()
        console.log("FE", fee)

        // add pool
        await dataProvider.addV3Pool(uniswap.tokens[supplyTokenIndex_0].address, uniswap.tokens[supplyTokenIndex_1].address, poolAddress)


        const p = await dataProvider.getV3Pool(uniswap.tokens[supplyTokenIndex_0].address, uniswap.tokens[supplyTokenIndex_1].address, 0)
        console.log("RET", p)
        const params = {
            tokenIn: uniswap.tokens[supplyTokenIndex_0].address,
            tokenOut: uniswap.tokens[supplyTokenIndex_1].address,
            fee: FeeAmount.MEDIUM,
            amountIn: swapAmount,
            amountOutMinimum: constants.MaxUint256,
            sqrtPriceLimitX96: '0'
        }
        const b = await compound.cTokens[supplyTokenIndex_0].balanceOf(accountAlice.address)
        console.log("DATA", accountAlice.address, poolAddress, b.toString())
        await accountAlice.connect(alice).swapCollateralExactIn(protocolId, params)

        const supply0 = await compound.cTokens[supplyTokenIndex_0].balanceOf(accountAlice.address)
        const supply1 = await compound.cTokens[supplyTokenIndex_1].balanceOf(accountAlice.address)
        // console.log(supply0, supply1)
        expect(supply0.toString()).to.equal(supplyAmount.sub(swapAmount))
        // expect(borrow1.toString()).to.be.(borrowAmount_1.sub(swapAmount).toString())
    })


})
