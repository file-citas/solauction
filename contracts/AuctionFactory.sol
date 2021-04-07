pragma solidity >=0.4.22 <0.9.0;

import { Auction } from './Auction.sol';
//import { AuctionNft } from './AuctionNft.sol';

contract AuctionFactory {
    //AuctionNft immutable public aucNft; // the nft token contract
    address immutable public implementation;
    address[] public auctions;

    constructor() {
        //aucNft = new AuctionNft();
        implementation = address(new Auction());
    }

    // Stolen from: https://kovan.etherscan.io/address/0x78344fab317a8e1870ac956adb6878233791c5d7#code
    /// @notice Creates a MinimalProxy contract via EIP1167 assembly code
    /// @dev Using this implementation: https://github.com/optionality/clone-factory
    /// @param target is an address of implementation, to which the MinimalProxy will point to
    /// @return result is an address of a newly created MinimalProxy
    function createClone(address target) internal returns (address result) {
        bytes20 targetBytes = bytes20(target);
        assembly {
            let clone := mload(0x40)
            mstore(clone, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(clone, 0x14), targetBytes)
            mstore(add(clone, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            result := create(0, clone, 0x37)
        }
    }

    /// @notice Tests if MinimalProxy instance really points to the correct implementation
    /// @param target is an address of implementation, to which the MinimalProxy should point to
    /// @param query is an address of MinimalProxy that needs to be tested
    /// @return result is true if MinimalProxy really points to the implementation address
    function isClone(address target, address query) external view returns (bool result) {
        bytes20 targetBytes = bytes20(target);
        assembly {
            let clone := mload(0x40)
            mstore(clone, 0x363d3d373d3d3d363d7300000000000000000000000000000000000000000000)
            mstore(add(clone, 0xa), targetBytes)
            mstore(add(clone, 0x1e), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)

            let other := add(clone, 0x40)
            extcodecopy(query, other, 0, 0x2d)
            result := and(
                eq(mload(clone), mload(other)),
                eq(mload(add(clone, 0xd)), mload(add(other, 0xd)))
            )
        }
    }

    function createAuction(
        uint256 nftTokenId,
        address aucNftAddress,
        address tokenAddress,
        uint blockDiff,
        uint reserve,
        uint limit)
        public
        payable
        {
        // TODO: where should this be done? in initialize, here or both?
        uint32 size;
        require(limit > 0, "Need Limit");
        require(limit>reserve, "Limit must be higher then reserve");
        require(blockDiff > 0, "Need block diff > 0");
        require(msg.sender != address(0), "Invalid owner");
        assembly {
            size := extcodesize(tokenAddress)
        }
        require(size > 0, "Invalid token address");
        assembly {
            size := extcodesize(aucNftAddress)
        }
        require(size > 0, "Invalid aucNft address");
        address clone = createClone(implementation);
        //uint256 nftTokenId = aucNft.mintNft(clone, ipfsHashAdvAsked); // mint token to auction (will be transferred to highest bidder)
        Auction(clone).initialize(
            payable(msg.sender),
            aucNftAddress,
            nftTokenId,
            tokenAddress,
            blockDiff,
            reserve,
            limit);
        auctions.push(clone);
    }

    // for testing
    //function nftAddress()
    //  view
    //  public
    //  returns (address)
    //  {
    //      return address(aucNft);
    //  }

    function allAuctions()
      view
      public
      returns (address[] memory) {
        return auctions;
    }
}
