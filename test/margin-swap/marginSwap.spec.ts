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
describe('Margin Swaps', async () => {
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

            await token.connect(deployer).transfer(bob.address, expandTo18Decimals(500))
            await token.connect(deployer).transfer(alice.address, expandTo18Decimals(500))
            await token.connect(deployer).transfer(carol.address, expandTo18Decimals(500))

            await token.connect(deployer).approve(uniswap.router.address, constants.MaxUint256)
            await token.connect(bob).approve(uniswap.router.address, constants.MaxUint256)
            await token.connect(carol).approve(uniswap.router.address, constants.MaxUint256)
            await token.connect(alice).approve(uniswap.router.address, constants.MaxUint256)
        }

        compound = await generateCompoundFixture(deployer, opts)

        await dataProvider.addComptroller(protocolId, compound.comptroller.address)

    })

    it('allows margin swap exact in', async () => {
        await feedProvider()
        await feedCompound()
        const supplyTokenIndex = 1
        const borrowTokenIndex = 0
        const providedAmount = expandTo18Decimals(500)

        // enter market
        await accountAlice.connect(alice).enterMarkets(protocolId, compound.cTokens.map(cT => cT.address))

        await network.provider.send("evm_increaseTime", [3600])
        await network.provider.send("evm_mine")

        const swapAmount = expandTo18Decimals(450)

        await addLiquidity(
            uniswap.tokens[supplyTokenIndex].address,
            uniswap.tokens[borrowTokenIndex].address,
            expandTo18Decimals(10_000),
            expandTo18Decimals(10_000)
        )

        const poolAddress = await uniswap.factory.getPool(uniswap.tokens[supplyTokenIndex].address, uniswap.tokens[borrowTokenIndex].address, FeeAmount.MEDIUM)

        // add pool
        await dataProvider.addV3Pool(uniswap.tokens[supplyTokenIndex].address, uniswap.tokens[borrowTokenIndex].address, poolAddress)

        const params = {
            tokenIn: uniswap.tokens[borrowTokenIndex].address,
            tokenOut: uniswap.tokens[supplyTokenIndex].address,
            fee: FeeAmount.MEDIUM,
            userAmountProvided: providedAmount,
            amountIn: swapAmount,
            sqrtPriceLimitX96: '0'
        }

        await uniswap.tokens[supplyTokenIndex].connect(alice).approve(accountAlice.address, constants.MaxUint256)

        // execute margin swap
        await accountAlice.connect(alice).openMarginPositionExactIn(protocolId, params)

        const supply0 = await compound.cTokens[supplyTokenIndex].balanceOf(accountAlice.address)
        const borrowAmount = await compound.cTokens[borrowTokenIndex].borrowBalanceStored(accountAlice.address)
        console.log(supply0.toString(), borrowAmount.toString())
        expect(borrowAmount.toString()).to.equal(swapAmount.toString())
    })

    it('allows margin swap exact out', async () => {
        await feedProvider()
        await feedCompound()
        const supplyTokenIndex = 1
        const borrowTokenIndex = 0
        const providedAmount = expandTo18Decimals(500)

        // enter market
        await accountAlice.connect(alice).enterMarkets(protocolId, compound.cTokens.map(cT => cT.address))

        await network.provider.send("evm_increaseTime", [3600])
        await network.provider.send("evm_mine")

        const swapAmount = expandTo18Decimals(450)

        await addLiquidity(
            uniswap.tokens[supplyTokenIndex].address,
            uniswap.tokens[borrowTokenIndex].address,
            expandTo18Decimals(10_000),
            expandTo18Decimals(10_000)
        )

        const poolAddress = await uniswap.factory.getPool(uniswap.tokens[supplyTokenIndex].address, uniswap.tokens[borrowTokenIndex].address, FeeAmount.MEDIUM)

        // add pool
        await dataProvider.addV3Pool(uniswap.tokens[supplyTokenIndex].address, uniswap.tokens[borrowTokenIndex].address, poolAddress)

        const params = {
            tokenIn: uniswap.tokens[borrowTokenIndex].address,
            tokenOut: uniswap.tokens[supplyTokenIndex].address,
            fee: FeeAmount.MEDIUM,
            userAmountProvided: providedAmount,
            amountOut: swapAmount,
            sqrtPriceLimitX96: '0'
        }

        await uniswap.tokens[supplyTokenIndex].connect(alice).approve(accountAlice.address, constants.MaxUint256)

        // execute margin swap
        await accountAlice.connect(alice).openMarginPositionExactOut(protocolId, params)

        const supply0 = await compound.cTokens[supplyTokenIndex].balanceOf(accountAlice.address)
        const borrowAmount = await compound.cTokens[borrowTokenIndex].borrowBalanceStored(accountAlice.address)
        console.log(supply0.toString(), borrowAmount.toString())
        expect(supply0.toString()).to.equal(providedAmount.add(swapAmount).toString())
    })

})
