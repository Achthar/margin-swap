import {
    abi as FACTORY_ABI,
    bytecode as FACTORY_BYTECODE,
} from '../../../artifacts/contracts/external-protocols/uniswapV3/core/UniswapV3Factory.sol/UniswapV3Factory.json'
import { ethers, waffle } from 'hardhat'
import { AccountInit, AccountInit__factory, DelegatorFacet, DelegatorFacet__factory, DiamondFacetManager, DiamondFacetManager__factory, DiamondFactory, DiamondFactory__factory, IUniswapV3Factory, IWETH9, MarginTraderFacet, MarginTraderFacet__factory, MockTimeSwapRouter, MoneyMarketDataProvider, MoneyMarketDataProvider__factory, MoneyMarketFacet, MoneyMarketFacet__factory, UniswapV3Factory, UniswapV3Factory__factory } from '../../../types'

import WETH9 from '../contracts/WETH9.json'

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { FacetCutAction, getSelectors } from '../../diamond/libraries/diamond'


export interface AccountFactoryFixture {
    diamondDeployer: DiamondFactory
    diamondFacetManager: DiamondFacetManager
    moneyMarketFacet: MoneyMarketFacet
    marginTraderFacet: MarginTraderFacet
    dataProvider: MoneyMarketDataProvider
    accountInit: AccountInit
    delegatorFacet: DelegatorFacet
}

export async function accountFactoryFixture(signer: SignerWithAddress): Promise<AccountFactoryFixture> {
    let diamondDeployer: DiamondFactory
    let diamondFacetManager: DiamondFacetManager
    let moneyMarketFacet: MoneyMarketFacet
    let dataProvider: MoneyMarketDataProvider
    let accountInit: AccountInit
    let delegatorFacet: DelegatorFacet
    let marginTraderFacet: MarginTraderFacet
    diamondFacetManager = await new DiamondFacetManager__factory(signer).deploy()
    accountInit = await new AccountInit__factory(signer).deploy()
    delegatorFacet = await new DelegatorFacet__factory(signer).deploy()
    moneyMarketFacet = await new MoneyMarketFacet__factory(signer).deploy()
    marginTraderFacet = await new MarginTraderFacet__factory(signer).deploy()

    await diamondFacetManager.diamondCut(
        [{
            facetAddress: accountInit.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(accountInit)
        }]
    )
    await diamondFacetManager.diamondCut(
        [{
            facetAddress: moneyMarketFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(moneyMarketFacet)
        }]
    )

    await diamondFacetManager.diamondCut(
        [{
            facetAddress: delegatorFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(delegatorFacet)
        }]
    )

    await diamondFacetManager.diamondCut(
        [{
            facetAddress: marginTraderFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(marginTraderFacet)
        }]
    )

    dataProvider = await new MoneyMarketDataProvider__factory(signer).deploy()

    diamondDeployer = await new DiamondFactory__factory(signer).deploy()

    await diamondDeployer.initialize(diamondFacetManager.address, dataProvider.address)

    return {
        diamondDeployer,
        diamondFacetManager,
        moneyMarketFacet,
        dataProvider,
        accountInit,
        delegatorFacet,
        marginTraderFacet
    }
}

export async function getMoneyMarketAccount(signer: SignerWithAddress, account: string): Promise<MoneyMarketFacet> {
    return (await new ethers.Contract(account, MoneyMarketFacet__factory.createInterface(), signer)) as MoneyMarketFacet
}

export async function createMoneyMarketAccount(signer: SignerWithAddress, fixture: AccountFactoryFixture): Promise<MoneyMarketFacet> {

    await fixture.diamondDeployer.connect(signer).createAccount()
    const accs = await fixture.diamondDeployer.getAccounts(signer.address)
    return (await new ethers.Contract(accs[accs.length - 1], MoneyMarketFacet__factory.createInterface(), signer)) as MoneyMarketFacet
}