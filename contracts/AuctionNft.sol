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

   function setAdvice(uint256 tokenId, string memory adv)
   public
   {
      require(ownerOf(tokenId) == msg.sender, "not owner");
      advGiven[tokenId] = adv;
   }

   function mintNft(address receiver, address _oracleAddress, string memory tokenURI)
   public
   returns (uint256) {
      //uint32 size;
      //assembly {
      //  size := extcodesize(_oracleAddress)
      //}
      //require(size > 0, "Invalid oracle address");

      _tokenIds.increment();
      uint256 newNftTokenId = _tokenIds.current();
      _mint(receiver, newNftTokenId);
      //_setTokenURI(newNftTokenId, tokenURI);
      //oracleAddress[newNftTokenId] = _oracleAddress;

      return newNftTokenId;
   }
}
