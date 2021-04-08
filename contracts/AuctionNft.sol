// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import { Oracle } from './Oracle.sol';

contract AuctionNft is ERC721, Ownable {
   using Counters for Counters.Counter;
   Counters.Counter private _tokenIds;
   // TODO: add reserve and limit ?
   mapping(uint256 => string)  public advGiven; // the advice given for each token (needs to be changable)
   mapping(uint256 => address)  public oracleAddress; // the oracle that will hold the result
   event TokenMined(address to, uint256 tokenId); // to work around stupid truffle issues

   constructor() ERC721("AUCTION-NFT", "NAUC") {}

   function getOracleAddress(uint256 tokenId)
   view
   public
   returns (address)
   {
      return oracleAddress[tokenId];
   }

   function getResult(uint256 tokenId)
   view
   public
   returns (uint256)
   {
      Oracle oracle = Oracle(oracleAddress[tokenId]);
      return oracle.getResult();
   }

   // Note: advice can be given at any time, and changed at any time
   // you can even claim your reward without giving any advice
   // the rational is that it would be in your best interest to give valid advice
   function setAdvice(uint256 tokenId, string memory adv)
   public
   {
      require(ownerOf(tokenId) == msg.sender, "not token owner");
      advGiven[tokenId] = adv;
   }

   function getAdvice(uint256 tokenId)
   view
   public
   returns (string memory)
   {
      return advGiven[tokenId];
   }


   function mintNft(address receiver, address _oracleAddress, string memory tokenURI)
   external
   onlyOwner
   returns (uint256) {
      uint32 size;
      assembly {
        size := extcodesize(_oracleAddress)
      }
      require(size > 0, "Invalid oracle address");

      _tokenIds.increment();
      uint256 newNftTokenId = _tokenIds.current();
      _mint(receiver, newNftTokenId);
      _setTokenURI(newNftTokenId, tokenURI);
      oracleAddress[newNftTokenId] = _oracleAddress;
      emit TokenMined(receiver, newNftTokenId);

      return newNftTokenId;
   }
}
