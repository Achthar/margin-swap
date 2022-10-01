import { Fixture } from 'ethereum-waffle'
import { ethers } from 'hardhat'
import { constants } from 'ethers'
import {
    IWETH9,
    MockTimeNonfungiblePositionManager,
    MockTimeSwapRouter,
    NonfungibleTokenPositionDescriptor,
    TestERC20Periphery,
    IUniswapV3Factory,
    ERC20Mock,
    ERC20Mock__factory,
    UniswapV3Factory,
} from '../../../types'
import { uniswapV3RouterFixture } from './unsiwapRouter'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

export interface UniswapFixture {
    weth9: IWETH9
    factory: UniswapV3Factory
    router: MockTimeSwapRouter
    nft: MockTimeNonfungiblePositionManager
    nftDescriptor: NonfungibleTokenPositionDescriptor
    tokens: ERC20Mock[]
}

export async function uniswapFixture(signer: SignerWithAddress, tokenCount = 5): Promise<UniswapFixture> {
    const { weth9, factory, router } = await uniswapV3RouterFixture(signer)

    let tokens: ERC20Mock[] = []
    for (let i = 0; i < tokenCount; i++) {
        const token = await new ERC20Mock__factory(signer).deploy("Token Nr" + i, "T" + i, signer.address, constants.MaxUint256.div(2))
        tokens.push(token)
    }

    const nftDescriptorLibraryFactory = await ethers.getContractFactory('NFTDescriptor')
    const nftDescriptorLibrary = await nftDescriptorLibraryFactory.deploy()
    const positionDescriptorFactory = await ethers.getContractFactory('NonfungibleTokenPositionDescriptor', {
        libraries: {
            NFTDescriptor: nftDescriptorLibrary.address,
        },
    })
    const nftDescriptor = (await positionDescriptorFactory.deploy(
        tokens[0].address,
        // 'ETH' as a bytes32 string
        '0x4554480000000000000000000000000000000000000000000000000000000000'
    )) as NonfungibleTokenPositionDescriptor

    const positionManagerFactory = await ethers.getContractFactory('MockTimeNonfungiblePositionManager')

    const nft = (await positionManagerFactory.deploy(
        factory.address,
        weth9.address,
        nftDescriptor.address
    )) as MockTimeNonfungiblePositionManager

    tokens.sort((a, b) => (a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1))

    return {
        weth9,
        factory,
        router,
        tokens,
        nft,
        nftDescriptor,
    }
}
