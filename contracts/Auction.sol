pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import { AuctionNft } from './AuctionNft.sol';

contract Auction is Initializable, IERC721Receiver {
   uint256 constant divfact = 10000;
   address payable public owner;
   uint public blockDiff; // if more than x blocks after last bid, auction is closed
   uint public lastBidBlock; // when the last bid was placed
   uint public funds;
   uint public reserve;
   uint public limit;
   uint public bid0; // highest Bid
   uint public bid1; // 2nd highest Bid
   address payable public bidder0; // highest bidder
   address public tokenAddress; // the dai token contract address
   address public aucNftAddress; // the nft token contract
   uint256 public nftTokenId; // the auction token (need this to claim the reward)

   // state
   bool public adviced; // winner can only give advice once
   bool public ownerHasWithdrawn; // owner should only get money once
   bool public winnerHasWithdrawn; // winner should only get money once
   bool public resultReported; // owner can only report the result once

   function initialize(
      address payable _owner,
      address _aucNftAddress,
      uint256 _nftTokenId,
      address _tokenAddress,
      uint _blockDiff,
      uint _reserve,
      uint _limit)
      payable
      public
      {
      uint32 size;
      require(_limit > 0, "Need Limit");
      require(_limit>_reserve, "Limit must be higher then reserve");
      require(_blockDiff > 0, "Need block diff > 0");
      require(_owner != address(0), "Invalid owner");
      assembly {
        size := extcodesize(_tokenAddress)
      }
      require(size > 0, "Invalid token address");
      assembly {
        size := extcodesize(_aucNftAddress)
      }
      require(size > 0, "Invalid aucNft address");
      AuctionNft aucNft = AuctionNft(_aucNftAddress);
      require(address(this) == aucNft.ownerOf(_nftTokenId), "Token not owned");
      // Note: we could check whether the token is in a good state, e.g. no result reported yet, valid oracle, etc
      aucNftAddress = _aucNftAddress;
      tokenAddress = _tokenAddress;
      nftTokenId = _nftTokenId;
      owner = _owner;
      blockDiff = _blockDiff;
      reserve = _reserve;
      limit = _limit;
      // TODO: should auction start on first bid?
   }

   function addFunds(uint _funds)
   onlyOwner
   hasNoFunds
   payable
   public
   {
      IERC20 token = IERC20(tokenAddress);
      token.transferFrom(msg.sender, address(this), _funds);
      funds = _funds;
   }

   function placeBid(uint amount)
      public
      payable
      onlyBeforeEnd
      onlyNotOwner
      hasFunds
      returns (bool success)
      {
         require(amount > 0, "Bid too low");
         require(amount <= limit, "Over limit");
         require(amount > bid0, "Bid too low");

         IERC20 token = IERC20(tokenAddress);
         token.transferFrom(msg.sender, address(this), amount);
         // pay back second highest bid
         if (bidder0 != payable(0)) {
            bid1 = bid0;
            token.transferFrom(address(this), bidder0, bid0);
         }
         bidder0 = payable(msg.sender);
         bid0 = amount;
         lastBidBlock = block.number;

         return true;
      }

   function min(uint a, uint b)
      private
      pure
      returns (uint)
      {
         if (a < b) return a;
         return b;
      }

   function max(uint a, uint b)
      private
      pure
      returns (uint)
      {
         if (a < b) return b;
         return a;
      }

   //function reportResult(uint256 _result)
   //   onlyAfterFirstBid
   //   onlyOwner
   //   onlyAfterEnd
   //   onlyBeforeResultReported
   //   onlyReserveMet
   //   hasFunds
   //   public
   //   returns (bool success)
   //   {
   //      require(_result <= limit, "Result over limit");
   //      result = _result;
   //      // TODO: How to calculate the factor?
   //      // penalize only in one direction?
   //      rewardPerc = uint256(min(bid0, result))*(divfact)/(uint256(bid0));
   //      resultReported = true;
   //      return true;
   //   }

   function getWinner()
      onlyAfterFirstBid
      onlyAfterEnd
      onlyReserveMet
      view
      public
      returns (address)
      {
         return bidder0;
      }

   function withdrawFunds()
      onlyOwner
      onlyAfterEnd
      onlyReserveNotMet
      hasFunds
      public
      returns (bool success)
      {
         IERC20 token = IERC20(tokenAddress);
         token.transferFrom(address(this), owner, funds);
         funds = 0;
         return true;
      }


   function claimToken()
      onlyAfterFirstBid
      onlyAfterEnd
      onlyReserveMet
      hasFunds
      public
      returns (bool success)
      {
         if(msg.sender == bidder0) {
            AuctionNft aucNft = AuctionNft(aucNftAddress);
            // transfer nft token to current highest bidder
            aucNft.approve(msg.sender, nftTokenId);
            aucNft.safeTransferFrom(address(this), msg.sender, nftTokenId);
         }
         return true;
      }

   function claimReward()
      public
      returns (bool success)
      {
         AuctionNft aucNft = AuctionNft(aucNftAddress);
         uint256 result = aucNft.getResult(nftTokenId);
         require(result <= limit, "Result over limit");
         if(msg.sender == aucNft.ownerOf(nftTokenId)) {
            // send token back to auction owner so that he can claim the upstream reward
            aucNft.safeTransferFrom(msg.sender, owner, nftTokenId);
            // TODO: How to calculate the factor?
            // penalize only in one direction?
            uint256 rewardPerc = uint256(min(bid0, result))*(divfact)/(uint256(bid0));
            uint256 withdrawalAmount = rewardPerc*(uint256(funds))/(divfact);
            IERC20 token = IERC20(tokenAddress);
            token.transferFrom(address(this), payable(msg.sender), withdrawalAmount);
            // send remaining funds back to auction owner
            token.transferFrom(address(this), owner, funds - withdrawalAmount);
            funds = 0;
         }
         return true;
      }

   function withdraw()
      onlyAfterEnd
      onlyAfterFirstBid
      hasFunds
      public
      returns (bool success)
      {
         require(bid0 > bid1, "Sth went wrong");

         if (reserve > bid0) {
            // if reserve is not met, everyone gets their money back
            IERC20 token = IERC20(tokenAddress);
            token.transferFrom(address(this), bidder0, bid0);
         } else {
            if (msg.sender == owner) {
               // Owner gets second highest
               if(!ownerHasWithdrawn) {
                  IERC20 token = IERC20(tokenAddress);
                  token.transferFrom(address(this), owner, max(reserve, bid1));
                  ownerHasWithdrawn = true;
               }
            } else if (msg.sender == bidder0) {
               // highest bidder gets diff to second highest bid back
               if(!winnerHasWithdrawn) {
                  IERC20 token = IERC20(tokenAddress);
                  token.transferFrom(address(this), bidder0, bid0 - max(reserve, bid1));
                  winnerHasWithdrawn = true;
               }
            }
         }

         return true;
      }

   // TODO: check why this is important
   function onERC721Received(address, address, uint256, bytes memory) public virtual override returns (bytes4) {
      return this.onERC721Received.selector;
   }

   modifier hasFunds {
      require(funds > 0, "no funds");
      _;
   }

   modifier hasNoFunds {
      require(funds == 0, "already has funds");
      _;
   }

   modifier onlyOwner {
      require(msg.sender == owner, "not owner");
      _;
   }

   modifier onlyNotOwner {
      require(msg.sender != owner, "is owner");
      _;
   }

   modifier onlyBeforeEnd {
      // TODO: should auction start on first bid?
      require(lastBidBlock == 0 || (block.number <= lastBidBlock + blockDiff), "ended");
      _;
   }

   modifier onlyAfterEnd {
      require(lastBidBlock != 0 && (block.number > lastBidBlock + blockDiff), "not ended");
      _;
   }

   modifier onlyBeforeFirstBid {
      require(bid0 == 0 && bidder0 == payable(0), "already have bids");
      _;
   }

   modifier onlyAfterFirstBid {
      require(bid0 > 0 && bidder0 != payable(0), "no bids");
      _;
   }

   modifier onlyReserveNotMet {
      require(bid0 < reserve, "reserve met");
      _;
   }

   modifier onlyReserveMet {
      require(bid0 >= reserve, "reserve not met");
      _;
   }

   modifier onlyBeforeResultReported {
      require(!resultReported, "already have result");
      _;
   }

   modifier onlyAfterResultReported {
      require(resultReported, "no result");
      _;
   }

}
