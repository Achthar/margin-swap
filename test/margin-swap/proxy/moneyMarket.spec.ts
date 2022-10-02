import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber, constants } from 'ethers';
import { ethers, network } from 'hardhat'
import { MoneyMarketOperator__factory, ImplementationProvider, ImplementationProvider__factory, MoneyMarketOperator, ProxyDeployer, ProxyDeployer__factory, MoneyMarketDataProvider, MoneyMarketDataProvider__factory, MarginAccountProxy__factory, ERC20Mock } from '../../../types';
import { FeeAmount, TICK_SPACINGS } from '../../uniswap-v3/periphery/shared/constants';
import { encodePriceSqrt } from '../../uniswap-v3/periphery/shared/encodePriceSqrt';
import { expandTo18Decimals } from '../../uniswap-v3/periphery/shared/expandTo18Decimals';
import { getMaxTick, getMinTick } from '../../uniswap-v3/periphery/shared/ticks';
import { CompoundFixture, CompoundOptions, generateCompoundFixture } from '../shared/compoundFixture';
import { expect } from '../shared/expect'
import { ONE_18 } from '../shared/marginSwapFixtures';
import { uniswapFixture, UniswapFixture } from '../shared/uniswapFixture';


// we prepare a setup for compound in hardhat
// this series of tests checks that the features used for the margin swap implementation
// are correclty set up and working
describe('Money Market operations', async () => {
    let deployer: SignerWithAddress, alice: SignerWithAddress, bob: SignerWithAddress, carol: SignerWithAddress;
    let proxyDeployer: ProxyDeployer
    let logicProvider: ImplementationProvider
    let logic: MoneyMarketOperator
    let dataProvider: MoneyMarketDataProvider
    let uniswap: UniswapFixture
    let compound: CompoundFixture
    let opts: CompoundOptions
    let accountAlice: MoneyMarketOperator
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

    async function createPoolWETH9(tokenAddress: string) {
        await uniswap.weth9.deposit({ value: liquidity })
        await uniswap.weth9.approve(uniswap.nft.address, constants.MaxUint256)
        return createPool(uniswap.weth9.address, tokenAddress)
    }

    async function getOperatorContract(acc: string) {
        return await new ethers.Contract(acc, MoneyMarketOperator__factory.createInterface()) as MoneyMarketOperator
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
        account: MoneyMarketOperator,
        index: number,
        amount: BigNumber
    ) {
        const supply_underlying = uniswap.tokens[index]
        const supply_cToken = compound.cTokens[index]

        await supply_underlying.connect(signer).approve(account.address, constants.MaxUint256)
        await account.connect(signer).mint(supply_underlying.address, protocolId, amount)
    }

    async function redeemUnderlyingFromCompound(
        signer: SignerWithAddress,
        account: MoneyMarketOperator,
        index: number,
        amount: BigNumber
    ) {
        const supply_underlying = uniswap.tokens[index]
        await supply_underlying.connect(signer).approve(account.address, constants.MaxUint256)
        await account.connect(signer).redeemUnderlying(supply_underlying.address, protocolId, amount)
    }



    async function borrowFromCompound(
        signer: SignerWithAddress,
        account: MoneyMarketOperator,
        index: number,
        amount: BigNumber
    ) {
        const borrow_underlying = uniswap.tokens[index]
        await account.connect(signer).borrow(borrow_underlying.address, protocolId, amount)
    }

    async function repayBorrowToCompound(
        signer: SignerWithAddress,
        account: MoneyMarketOperator,
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
        logic = await new MoneyMarketOperator__factory(deployer).deploy()
        logicProvider = await new ImplementationProvider__factory(deployer).deploy(logic.address)
        dataProvider = await new MoneyMarketDataProvider__factory(deployer).deploy()
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

    it('deploys account', async () => {
        await proxyDeployer.connect(alice).createAccount(alice.address)
    })

    it('allows approving underlyings', async () => {
        await feedProvider()
        await proxyDeployer.connect(alice).createAccount(alice.address)
        const accounts = await proxyDeployer.getAccounts(alice.address)
        const acccountContract = await getOperatorContract(accounts[0])
        await acccountContract.connect(alice).approveUnderlyings(uniswap.tokens.map(t => t.address), protocolId)
    })

    it('allows mint', async () => {
        await feedProvider()
        await feedCompound()
        const amount = expandTo18Decimals(1_000)
        const tokenIndex = 1
        await supplyToCompound(alice, accountAlice, tokenIndex, amount)

        const bal = await compound.cTokens[tokenIndex].balanceOf(accountAlice.address)
        expect(bal.toString()).to.equal(amount.toString())
    })

    it('allows redeem', async () => {

        await feedProvider()
        await feedCompound()
        const amount = expandTo18Decimals(1_000)
        const tokenIndex = 1
        const balPre = await compound.cTokens[tokenIndex].balanceOf(accountAlice.address)
        await supplyToCompound(alice, accountAlice, tokenIndex, amount)

        await network.provider.send("evm_increaseTime", [3600])
        await network.provider.send("evm_mine")

        await redeemUnderlyingFromCompound(alice, accountAlice, tokenIndex, amount)

        const balPost = await compound.cTokens[tokenIndex].balanceOf(accountAlice.address)
        expect(balPost.toString()).to.equal(balPre.toString())
    })

    it('allows borrow', async () => {
        await feedProvider()
        await feedCompound()
        const supplyAmount = expandTo18Decimals(1_000)
        const supplyTokenIndex = 1
        const borrowAmount = expandTo18Decimals(100)
        const borrowTokenIndex = 0

        await supplyToCompound(alice, accountAlice, supplyTokenIndex, supplyAmount)

        // enter market
        await accountAlice.connect(alice).enterMarkets(protocolId, compound.cTokens.map(cT => cT.address))

        await borrowFromCompound(alice, accountAlice, borrowTokenIndex, borrowAmount)

        // fetcch balance
        const borrowed = await uniswap.tokens[borrowTokenIndex].balanceOf(accountAlice.address)

        // check whether borrowed amount was received
        expect(borrowed.toString()).to.equal(borrowAmount.toString())

    })

    it('allows repay borrow', async () => {
        await feedProvider()
        await feedCompound()
        const supplyAmount = expandTo18Decimals(1_000)
        const supplyTokenIndex = 1
        const borrowAmount = expandTo18Decimals(100)
        const borrowTokenIndex = 0

        await supplyToCompound(alice, accountAlice, supplyTokenIndex, supplyAmount)

        // enter market
        await accountAlice.connect(alice).enterMarkets(protocolId, compound.cTokens.map(cT => cT.address))

        await borrowFromCompound(alice, accountAlice, borrowTokenIndex, borrowAmount)

        await network.provider.send("evm_increaseTime", [3600])
        await network.provider.send("evm_mine")

        await repayBorrowToCompound(alice, accountAlice, borrowTokenIndex, borrowAmount)

    })


})
