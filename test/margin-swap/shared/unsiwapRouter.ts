import {
    abi as FACTORY_ABI,
    bytecode as FACTORY_BYTECODE,
} from '../../../artifacts/contracts/external-protocols/uniswapV3/core/UniswapV3Factory.sol/UniswapV3Factory.json'
import { ethers, waffle } from 'hardhat'
import { IUniswapV3Factory, IWETH9, MockTimeSwapRouter, UniswapV3Factory, UniswapV3Factory__factory } from '../../../types'

import WETH9 from '../contracts/WETH9.json'

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'


export interface RouterFixture {
    weth9: IWETH9
    factory: UniswapV3Factory
    router: MockTimeSwapRouter
}

export async function uniswapV3RouterFixture(signer: SignerWithAddress): Promise<RouterFixture> {
    const weth9 = (await waffle.deployContract(signer, {
        bytecode: WETH9.bytecode,
        abi: WETH9.abi,
    })) as IWETH9

    const factory = await new UniswapV3Factory__factory(signer).deploy()
    
    // (await waffle.deployContract(signer, {
    //     bytecode: FACTORY_BYTECODE,
    //     abi: FACTORY_ABI,
    // })) as IUniswapV3Factory



    const router = (await (await ethers.getContractFactory('MockTimeSwapRouter')).deploy(
        factory.address,
        weth9.address
    )) as MockTimeSwapRouter

    return { factory, weth9, router }
}
