pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";

contract Auction is Initializable {
   uint256 constant divfact = 10000;
   address payable public owner;
   uint public blockDiff; // if more than x blocks after last bid, auction is closed
   uint public lastBidBlock; // when the last bid was placed
   uint public funds;
   uint public reserve;
   uint public limit;
   uint public result; // the outcome
   uint256 public rewardPerc; // the reward percentage based on outcome [0;1]
   string public ipfsHashAdvAsked;
   string public ipfsHashAdvGiven;
   uint public bid0; // highest Bid
   uint public bid1; // 2nd highest Bid
   address payable public bidder0; // highest bidder
   address payable public bidder1; // second highest bidder
   mapping(address => uint256) public fundsByBidder;
   address public tokenAddress;

   // state
   bool public adviced; // winner can only give advice once
   bool public ownerHasWithdrawn; // owner should only get money once
   bool public winnerHasWithdrawn; // winner should only get money once
   bool public resultReported; // owner can only report the result once

   //constructor(address payable _owner, address _tokenAddress, uint _blockDiff, uint _reserve, uint _limit, string memory _ipfsHashAdvAsked) payable {
   function initialize(address payable _owner, address _tokenAddress, uint _blockDiff, uint _reserve, uint _limit, string memory _ipfsHashAdvAsked) payable public {
      uint32 size;
      require(_limit > 0, "Need Limit");
      require(_limit>_reserve, "Limit must be higher then reserve");
      require(_blockDiff > 0, "Need block diff > 0");
      require(_owner != address(0), "Invalid owner");
      assembly {
        size := extcodesize(_tokenAddress)
      }
      require(size > 0, "Invalid token address");

      tokenAddress = _tokenAddress;
      owner = _owner;
      blockDiff = _blockDiff;
      reserve = _reserve;
      limit = _limit;
      ipfsHashAdvAsked = _ipfsHashAdvAsked;
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
            //assert(bidder0.send(bid0));
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

   function reportResult(uint256 _result)
      onlyAfterFirstBid
      onlyOwner
      onlyAfterEnd
      onlyBeforeResultReported
      onlyReserveMet
      hasFunds
      public
      returns (bool success)
      {
         require(_result <= limit, "Result over limit");
         result = _result;
         // TODO: How to calculate the factor?
         // penalize only in one direction?
         rewardPerc = uint256(min(bid0, result))*(divfact)/(uint256(bid0));
         resultReported = true;
         return true;
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
         //assert(owner.send(funds));
         funds = 0;
         return true;
      }

   function evaluateAuction(string memory _ipfsHashAdvGiven)
      onlyAfterFirstBid
      onlyAfterEnd
      onlyAfterResultReported
      onlyReserveMet
      hasFunds
      public
      returns (bool success)
      {
         // I guess checks on the advice hash are unneccessary since it is in the winners best interest to give valid advice?
         // also: should the winner be allowed to change the advice?
         if(!adviced && msg.sender == bidder0) {
            uint256 withdrawalAmount = rewardPerc*(uint256(funds))/(divfact);
            IERC20 token = IERC20(tokenAddress);
            token.transferFrom(address(this), payable(msg.sender), withdrawalAmount);
            //assert(payable(msg.sender).send(withdrawalAmount));
            ipfsHashAdvGiven = _ipfsHashAdvGiven;
            adviced = true;
            // TODO: burn token, is that even possible with dai?
            //require( burn(funds - withdrawalAmount));
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
            //assert(bidder0.send(bid0));
            IERC20 token = IERC20(tokenAddress);
            token.transferFrom(address(this), bidder0, bid0);
         } else {
            if (msg.sender == owner) {
               // Owner gets second highest
               if(!ownerHasWithdrawn) {
                  IERC20 token = IERC20(tokenAddress);
                  token.transferFrom(address(this), owner, max(reserve, bid1));
                  //require(owner.send(max(reserve, bid1)));
                  ownerHasWithdrawn = true;
               }
            } else if (msg.sender == bidder0) {
               // highest bidder gets diff to second highest bid back
               if(!winnerHasWithdrawn) {
                  IERC20 token = IERC20(tokenAddress);
                  token.transferFrom(address(this), bidder0, bid0 - max(reserve, bid1));
                  //require(bidder0.send(bid0 - max(reserve, bid1)));
                  winnerHasWithdrawn = true;
               }
            }
         }

         return true;
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
