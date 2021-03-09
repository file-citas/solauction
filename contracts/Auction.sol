pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/math/SafeMath.sol";

contract Auction {
   using SafeMath for uint256;
   uint256 constant divfact = 10000;
   address public owner;
   uint public endBlock;
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
   mapping(address => uint256) public fundsByBidder;

   // state
   bool public settled; // auction was setteld by owner (no more bids, every looser gets theit money back, winner gets diff to second highest bid, owner gets second highest bid)
   bool public adviced; // winner can only give advice once
   bool public ownerHasWithdrawn; // owner should only get money once
   bool public winnerHasWithdrawn; // winner should only get money once
   bool public resultReported; // owner can only report the result once

   constructor(address _owner, uint _endBlock, uint _reserve, uint _limit, string memory _ipfsHashAdvAsked) public payable {
      require(msg.value > 0, "Need Funds");
      require(_limit > 0, "Need Limit");
      require(_limit>_reserve, "Limit under reserve");
      require(_endBlock >= block.number, "End time before now");
      require(_owner != address(0), "Invalid owner");

      owner = _owner;
      endBlock = _endBlock;
      funds = msg.value;
      reserve = _reserve;
      limit = _limit;
      ipfsHashAdvAsked = _ipfsHashAdvAsked;
      bid1 = 0;
      bid0 = 0;
      bidder0 = address(0);
      result = 0;
      rewardPerc = 0;
   }

   function placeBid()
      public
      payable
      onlyBeforeEnd
      onlyNotSettled
      onlyNotOwner
      returns (bool success)
      {
         // reject bids of 0 ETH
         require(msg.value > 0, "Bid too low");
         require(fundsByBidder[msg.sender] + msg.value <= limit, "Over limit");

         // calculate the user's total bid based on the current amount they've sent to the contract
         // plus whatever has been sent with this transaction
         uint newBid = fundsByBidder[msg.sender] + msg.value;

         require(newBid > bid0, "Bid too low");

         if (msg.sender != bidder0) {
            // store second highest bid, but only once we have two bidders
            if(bidder0 != address(0)) {
               bid1 = fundsByBidder[bidder0];
            }
            bidder0 = msg.sender;
         }
         fundsByBidder[msg.sender] = newBid;
         bid0 = fundsByBidder[bidder0];

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

   function settleAuction()
      onlyOwner
      onlyBeforeEnd
      public
      returns (bool success)
      {
         settled = true;
         return true;
      }

   function reportResult(uint256 _result)
      onlyOwner
      onlyAfterEnd
      onlyBeforeResultReported
      onlyReserveMet
      public
      returns (bool success)
      {
         require(_result >= reserve, "Result below reserve");
         require(_result < limit, "Result over limit");
         result = _result;
         // TODO: How to calculate the factor?
         // penalize only in one direction?
         rewardPerc = uint256(min(bid0, result)).mul(divfact).div(uint256(bid0));
         resultReported = true;
         return true;
      }

   function evaluateAuction(string memory _ipfsHashAdvGiven)
      onlyAfterEnd
      onlyAfterResultReported
      onlyReserveMet
      public
      returns (bool success)
      {
         // I guess checks on the advice hash are unneccessary since it is in the winners best interest to give valid advice?
         // also: should the winner be allowed to change the advice?
         if(!adviced && msg.sender == bidder0) {
            uint256 withdrawalAmount = rewardPerc.mul(uint256(funds)).div(divfact);
            assert(msg.sender.send(withdrawalAmount));
            funds = 0;
            ipfsHashAdvGiven = _ipfsHashAdvGiven;
            adviced = true;
            // TODO: burn or transfer to some other entity
            //require( burn(funds - withdrawalAmount));
         }
         return true;
      }

   function withdraw()
      onlyEnded
      public
      returns (bool success)
      {
         require(bidder0 != address(0), "No Bids yet");
         require(bid0 > bid1, "Sth went wrong");
         address withdrawalAccount;
         uint withdrawalAmount;

         // if reserve is not met, everyone gets their money back
         if (reserve > bid0) {
               withdrawalAccount = msg.sender;
               withdrawalAmount = fundsByBidder[withdrawalAccount];
         } else {
            if (msg.sender == owner) {
               // Owner gets second highest
               if(!ownerHasWithdrawn) {
                  withdrawalAccount = bidder0;
                  withdrawalAmount = max(reserve, bid1);
                  ownerHasWithdrawn = true;
               }
            } else if (msg.sender == bidder0) {
               // highest bidder gets diff to second highest bid back
               if(!winnerHasWithdrawn) {
                  withdrawalAccount = bidder0;
                  withdrawalAmount = bid0 - max(reserve, bid1);
                  winnerHasWithdrawn = true;
               }
            } else {
               // anyone who participated but did not win the auction should be allowed to withdraw
               // the full amount of their funds
               withdrawalAccount = msg.sender;
               withdrawalAmount = fundsByBidder[withdrawalAccount];
            }
         }

         fundsByBidder[withdrawalAccount] -= withdrawalAmount;

         // send the funds
         assert(msg.sender.send(withdrawalAmount));

         return true;
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
      require(block.number <= endBlock, "ended");
      _;
   }

   modifier onlyAfterEnd {
      require(block.number > endBlock, "not ended");
      _;
   }

   modifier onlyReserveMet {
      require(bid0 > reserve, "reserve not met");
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

   modifier onlyNotSettled {
      require(!settled, "settled");
      _;
   }

   modifier onlyEnded {
      require(block.number > endBlock || settled, "still running");
      _;
   }
}


