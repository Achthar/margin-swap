import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { constants } from 'ethers';
import { ethers, network } from 'hardhat'
import { MoneyMarketOperator__factory, ImplementationProvider, ImplementationProvider__factory, MoneyMarketOperator, ProxyDeployer, ProxyDeployer__factory, MoneyMarketDataProvider, MoneyMarketDataProvider__factory, MarginAccountProxy__factory } from '../../types';
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
describe('Collateral Swap', async () => {
    let deployer: SignerWithAddress, alice: SignerWithAddress, bob: SignerWithAddress, carol: SignerWithAddress;
    let proxyDeployer: ProxyDeployer
    let logicProvider: ImplementationProvider
    let logic: MoneyMarketOperator
    let dataProvider: MoneyMarketDataProvider
    let uniswap: UniswapFixture
    let compound: CompoundFixture
    let opts: CompoundOptions

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

    beforeEach('create 0-1 and 1-2 pools', async () => {
        await createPool(uniswap.tokens[0].address, uniswap.tokens[1].address)
        await createPool(uniswap.tokens[1].address, uniswap.tokens[2].address)
    })


    beforeEach('Deploy Account, Trader, Uniswap and Compound', async () => {
        [deployer, alice, bob, carol] = await ethers.getSigners();
        proxyDeployer = await new ProxyDeployer__factory(deployer).deploy()
        logic = await new MoneyMarketOperator__factory(deployer).deploy()
        logicProvider = await new ImplementationProvider__factory(deployer).deploy(logic.address)
        const x = await logicProvider.getImplementation()
        console.log("DD", x)
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

        compound = await generateCompoundFixture(deployer, opts)

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

    })


    it('deploys account', async () => {
        await proxyDeployer.connect(alice).createAccount(alice.address)
    })

    it('deploys account and returns address', async () => {
        await proxyDeployer.connect(alice).createAccount(alice.address)

        const accounts = await proxyDeployer.getAccounts(alice.address)
        console.log(accounts)
        const ac = await new ethers.Contract(accounts[0], MarginAccountProxy__factory.createInterface())
        const imp = await ac.connect(deployer)._implementation()
        console.log(imp)
    })

})