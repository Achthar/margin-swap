// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "./MoneyMarketOperator.sol";
import {IMarginTrader} from "../interfaces/margin-swap/IMarginTrader.sol";
import "../external-protocols/uniswapV3/core/interfaces/IUniswapV3Pool.sol";
import "../external-protocols/uniswapV3/periphery/interfaces/ISwapRouter.sol";
import "../external-protocols/uniswapV3/core/interfaces/callback/IUniswapV3SwapCallback.sol";
import "./libraries/Path.sol";
import "./libraries/SafeCast.sol";
import "./libraries/TickMathConstants.sol";

// solhint-disable max-line-length

/**
 * @title MarginTrader contract
 * @notice Allows users to build large margins positions with one contract interaction
 * @author Achthar
 */
contract MarginTrader is MoneyMarketOperator, IUniswapV3SwapCallback {
    using Path for bytes;
    using SafeCast for uint256;

    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    constructor() {}

    function swapBorrowExactIn(uint256 _protocolId, ExactInputSingleParams memory _uniswapV3params) external payable onlyOwner returns (uint256) {
        address pool = IDataProvider(dataProvider).getV3Pool(_uniswapV3params.tokenIn, _uniswapV3params.tokenOut, _uniswapV3params.fee);
        SwapCallbackData memory data = SwapCallbackData({
            tokenIn: _uniswapV3params.tokenIn,
            tokenOut: _uniswapV3params.tokenOut,
            tradeType: 0,
            moneyMarketProtocolId: _protocolId
        });

        uint160 sqrtPriceLimitX96 = _uniswapV3params.sqrtPriceLimitX96;

        bool zeroForOne = _uniswapV3params.tokenIn < _uniswapV3params.tokenOut;
        (int256 amount0, int256 amount1) = IUniswapV3Pool(pool).swap(
            address(this),
            zeroForOne,
            _uniswapV3params.amountIn.toInt256(),
            sqrtPriceLimitX96 == 0 ? (zeroForOne ? TickMathConstants.MIN_SQRT_RATIO + 1 : TickMathConstants.MAX_SQRT_RATIO - 1) : sqrtPriceLimitX96,
            abi.encode(data)
        );

        return uint256(-(zeroForOne ? amount1 : amount0));
    }

    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }

    function swapBorrowExactOut(uint256 _protocolId, ExactOutputSingleParams memory _uniswapV3params)
        external
        payable
        onlyOwner
        returns (uint256 amountIn)
    {
        address pool = IDataProvider(dataProvider).getV3Pool(_uniswapV3params.tokenIn, _uniswapV3params.tokenOut, _uniswapV3params.fee);
        SwapCallbackData memory data = SwapCallbackData({
            tokenIn: _uniswapV3params.tokenIn,
            tokenOut: _uniswapV3params.tokenOut,
            tradeType: 0,
            moneyMarketProtocolId: _protocolId
        });

        uint160 sqrtPriceLimitX96 = _uniswapV3params.sqrtPriceLimitX96;

        bool zeroForOne = _uniswapV3params.tokenIn < _uniswapV3params.tokenOut;
        (int256 amount0, int256 amount1) = IUniswapV3Pool(pool).swap(
            address(this),
            zeroForOne,
            -_uniswapV3params.amountOut.toInt256(),
            sqrtPriceLimitX96 == 0 ? (zeroForOne ? TickMathConstants.MIN_SQRT_RATIO + 1 : TickMathConstants.MAX_SQRT_RATIO - 1) : sqrtPriceLimitX96,
            abi.encode(data)
        );
        uint256 amountOutReceived;
        (amountIn, amountOutReceived) = zeroForOne ? (uint256(amount0), uint256(-amount1)) : (uint256(amount1), uint256(-amount0));
        // it's technically possible to not receive the full output amount,
        // so if no price limit has been specified, require this possibility away
        if (sqrtPriceLimitX96 == 0) require(amountOutReceived == _uniswapV3params.amountOut);
    }

    function swapCollateralExactIn(uint256 _protocolId, ExactInputSingleParams memory _uniswapV3params) external payable onlyOwner returns (uint256) {
        address pool = IDataProvider(dataProvider).getV3Pool(_uniswapV3params.tokenIn, _uniswapV3params.tokenOut, _uniswapV3params.fee);
        SwapCallbackData memory data = SwapCallbackData({
            tokenIn: _uniswapV3params.tokenIn,
            tokenOut: _uniswapV3params.tokenOut,
            tradeType: 1,
            moneyMarketProtocolId: _protocolId
        });

        uint160 sqrtPriceLimitX96 = _uniswapV3params.sqrtPriceLimitX96;

        bool zeroForOne = _uniswapV3params.tokenIn < _uniswapV3params.tokenOut;
        (int256 amount0, int256 amount1) = IUniswapV3Pool(pool).swap(
            address(this),
            zeroForOne,
            _uniswapV3params.amountIn.toInt256(),
            sqrtPriceLimitX96 == 0 ? (zeroForOne ? TickMathConstants.MIN_SQRT_RATIO + 1 : TickMathConstants.MAX_SQRT_RATIO - 1) : sqrtPriceLimitX96,
            abi.encode(data)
        );

        return uint256(-(zeroForOne ? amount1 : amount0));
    }

    function swapCollateralExactOut(uint256 _protocolId, ExactOutputSingleParams memory _uniswapV3params)
        external
        payable
        onlyOwner
        returns (uint256 amountIn)
    {
        address pool = IDataProvider(dataProvider).getV3Pool(_uniswapV3params.tokenIn, _uniswapV3params.tokenOut, _uniswapV3params.fee);
        SwapCallbackData memory data = SwapCallbackData({
            tokenIn: _uniswapV3params.tokenIn,
            tokenOut: _uniswapV3params.tokenOut,
            tradeType: 1,
            moneyMarketProtocolId: _protocolId
        });

        uint160 sqrtPriceLimitX96 = _uniswapV3params.sqrtPriceLimitX96;

        bool zeroForOne = _uniswapV3params.tokenIn < _uniswapV3params.tokenOut;
        (int256 amount0, int256 amount1) = IUniswapV3Pool(pool).swap(
            address(this),
            zeroForOne,
            -_uniswapV3params.amountOut.toInt256(),
            sqrtPriceLimitX96 == 0 ? (zeroForOne ? TickMathConstants.MIN_SQRT_RATIO + 1 : TickMathConstants.MAX_SQRT_RATIO - 1) : sqrtPriceLimitX96,
            abi.encode(data)
        );
        uint256 amountOutReceived;
        (amountIn, amountOutReceived) = zeroForOne ? (uint256(amount0), uint256(-amount1)) : (uint256(amount1), uint256(-amount0));
        // it's technically possible to not receive the full output amount,
        // so if no price limit has been specified, require this possibility away
        if (sqrtPriceLimitX96 == 0) require(amountOutReceived == _uniswapV3params.amountOut);
    }

    struct MarginSwapParamsExactOut {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        uint256 userAmountProvided;
        uint256 amountOut;
        uint160 sqrtPriceLimitX96;
    }

    function openMarginPositionExactOut(uint256 _protocolId, MarginSwapParamsExactOut memory _marginSwapParams)
        external
        payable
        onlyOwner
        returns (uint256 amountIn)
    {
        TransferHelper.safeTransferFrom(_marginSwapParams.tokenOut, msg.sender, address(this), _marginSwapParams.userAmountProvided);
        CErc20Interface cTokenOut = IDataProvider(dataProvider).cToken(_marginSwapParams.tokenOut, _protocolId);
        cTokenOut.mint(_marginSwapParams.userAmountProvided);

        address pool = IDataProvider(dataProvider).getV3Pool(_marginSwapParams.tokenIn, _marginSwapParams.tokenOut, _marginSwapParams.fee);
        SwapCallbackData memory data = SwapCallbackData({
            tokenIn: _marginSwapParams.tokenIn,
            tokenOut: _marginSwapParams.tokenOut,
            tradeType: 2,
            moneyMarketProtocolId: _protocolId
        });

        uint160 sqrtPriceLimitX96 = _marginSwapParams.sqrtPriceLimitX96;

        bool zeroForOne = _marginSwapParams.tokenIn < _marginSwapParams.tokenOut;
        (int256 amount0, int256 amount1) = IUniswapV3Pool(pool).swap(
            address(this),
            zeroForOne,
            -_marginSwapParams.amountOut.toInt256(),
            sqrtPriceLimitX96 == 0 ? (zeroForOne ? TickMathConstants.MIN_SQRT_RATIO + 1 : TickMathConstants.MAX_SQRT_RATIO - 1) : sqrtPriceLimitX96,
            abi.encode(data)
        );
        uint256 amountOutReceived;
        (amountIn, amountOutReceived) = zeroForOne ? (uint256(amount0), uint256(-amount1)) : (uint256(amount1), uint256(-amount0));
        // it's technically possible to not receive the full output amount,
        // so if no price limit has been specified, require this possibility away
        if (sqrtPriceLimitX96 == 0) require(amountOutReceived == _marginSwapParams.amountOut);
    }

    struct MarginSwapParamsExactIn {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        uint256 userAmountProvided;
        uint256 amountIn;
        uint160 sqrtPriceLimitX96;
    }

    function openMarginPositionExactIn(uint256 _protocolId, MarginSwapParamsExactIn memory _marginSwapParams)
        external
        payable
        onlyOwner
        returns (uint256)
    {
        TransferHelper.safeTransferFrom(_marginSwapParams.tokenOut, msg.sender, address(this), _marginSwapParams.userAmountProvided);
        CErc20Interface cTokenOut = IDataProvider(dataProvider).cToken(_marginSwapParams.tokenOut, _protocolId);
        cTokenOut.mint(_marginSwapParams.userAmountProvided);
        address pool = IDataProvider(dataProvider).getV3Pool(_marginSwapParams.tokenIn, _marginSwapParams.tokenOut, _marginSwapParams.fee);

        SwapCallbackData memory data = SwapCallbackData({
            tokenIn: _marginSwapParams.tokenIn,
            tokenOut: _marginSwapParams.tokenOut,
            tradeType: 2,
            moneyMarketProtocolId: _protocolId
        });

        uint160 sqrtPriceLimitX96 = _marginSwapParams.sqrtPriceLimitX96;

        bool zeroForOne = _marginSwapParams.tokenIn < _marginSwapParams.tokenOut;
        (int256 amount0, int256 amount1) = IUniswapV3Pool(pool).swap(
            address(this),
            zeroForOne,
            _marginSwapParams.amountIn.toInt256(),
            sqrtPriceLimitX96 == 0 ? (zeroForOne ? TickMathConstants.MIN_SQRT_RATIO + 1 : TickMathConstants.MAX_SQRT_RATIO - 1) : sqrtPriceLimitX96,
            abi.encode(data)
        );

        return uint256(-(zeroForOne ? amount1 : amount0));
    }

    struct SwapCallbackData {
        address tokenIn;
        address tokenOut;
        uint256 tradeType;
        uint256 moneyMarketProtocolId;
    }

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external override {
        require(amount0Delta > 0 || amount1Delta > 0); // swaps entirely within 0-liquidity regions are not supported
        SwapCallbackData memory data = abi.decode(_data, (SwapCallbackData));
        (address tokenIn, address tokenOut, uint256 tradeType) = (data.tokenIn, data.tokenOut, data.tradeType);
        // validate pool (so that not any user or contract can call this function)
        (CErc20Interface cTokenIn, CErc20Interface cTokenOut) = IDataProvider(dataProvider).validatePoolAndFetchCTokens(
            msg.sender,
            tokenIn,
            tokenOut,
            data.moneyMarketProtocolId
        );

        // borrow swap;
        if (tradeType == 0) {
            (uint256 amountToBorrow, uint256 amountToRepay) = amount0Delta > 0
                ? (uint256(amount0Delta), uint256(-amount1Delta))
                : (uint256(amount1Delta), uint256(-amount0Delta));
            cTokenOut.repayBorrow(amountToRepay);
            cTokenIn.borrow(amountToBorrow);
            TransferHelper.safeTransfer(tokenIn, msg.sender, amountToBorrow);

            return;
        }
        // collateral swap;
        if (tradeType == 1) {
            (uint256 amountToWithdraw, uint256 amountToSupply) = amount0Delta > 0
                ? (uint256(amount0Delta), uint256(-amount1Delta))
                : (uint256(amount1Delta), uint256(-amount0Delta));

            cTokenOut.mint(amountToSupply);
            cTokenIn.redeemUnderlying(amountToWithdraw);
            TransferHelper.safeTransfer(tokenIn, msg.sender, amountToWithdraw);

            return;
        }

        // margin swap;
        if (tradeType == 2) {
            (uint256 amountToBorrow, uint256 amountToSupply) = amount0Delta > 0
                ? (uint256(amount0Delta), uint256(-amount1Delta))
                : (uint256(amount1Delta), uint256(-amount0Delta));

            cTokenOut.mint(amountToSupply);
            cTokenIn.borrow(amountToBorrow);
            TransferHelper.safeTransfer(tokenIn, msg.sender, amountToBorrow);

            return;
        }

        return;
    }
}
