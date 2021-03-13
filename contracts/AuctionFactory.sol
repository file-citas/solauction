pragma solidity >=0.4.22 <0.9.0;

import { Auction } from './Auction.sol';

contract AuctionFactory {
    address[] public auctions;

    function createAuction(bytes32 salt, address tokenAddress, uint endBlock, uint reserve, uint limit, string memory ipfsHashAdvAsked) public payable {
        //Auction newAuction = (new Auction).value(msg.value)(msg.sender, endBlock, reserve, limit, ipfsHashAdvAsked);
        bytes32 newsalt = keccak256(abi.encodePacked(salt, msg.sender));
        Auction newAuction = (new Auction{salt: newsalt})(payable(msg.sender), tokenAddress, endBlock, reserve, limit, ipfsHashAdvAsked);
        auctions.push(address(newAuction));
    }

    function allAuctions()
      view
      public
      returns (address[] memory) {
        return auctions;
    }
}
