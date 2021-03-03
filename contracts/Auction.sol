pragma solidity >=0.4.22 <0.9.0;

contract Auction {
    address public owner;
    uint public endBlock;
    uint public funds;
    uint public limit;
    string public desc;

    // state
    bool public canceled; // auction was cancelled by owner (no more bids, everyone gets their money back)
    bool public settled; // auction was setteld by owner (no more bids, every looser gets theit money back, winner gets diff to second highest bid, owner gets second highest bid)
    address payable public Bidder0; // highest bidder
    address public Bidder1; // sencond highest bidder
    mapping(address => uint256) public fundsByBidder;

    event LogBid(address bidder, uint bid, address Bidder0, uint highestBid);
    event LogWithdrawal(address withdrawer, address withdrawalAccount, uint amount);
    event LogEvaluate(address withdrawer, address withdrawalAccount, uint amount);
    event LogCanceled();
    event LogSettled();

    constructor(address _owner, uint _endBlock, uint _limit, string memory _desc) public payable {
        require(msg.value > 0, "Need Funds");
        require(_limit > 0, "Need Limit");
        require(_endBlock > block.number, "End time before now");
        require(_owner != address(0), "Invalid owner");

        owner = _owner;
        endBlock = _endBlock;
        funds = msg.value;
        limit = _limit;
        desc = _desc;
        Bidder0 = address(0);
        Bidder1 = address(0);
    }

    function getFunds()
        public
        view
        returns (uint)
    {
       return funds;
    }

    function getSecondHighestBid()
        public
        view
        returns (uint)
    {
        return fundsByBidder[Bidder1];
    }

    function getHighestBid()
        public
        view
        returns (uint)
    {
        return fundsByBidder[Bidder0];
    }

    function placeBid()
        public
        payable
        onlyBeforeEnd
        onlyNotCanceled
        onlyNotOwner
        returns (bool success)
    {
        // reject bids of 0 ETH
        require(msg.value > 0);
        require(fundsByBidder[msg.sender] + msg.value <= limit, "Over limit");

        // calculate the user's total bid based on the current amount they've sent to the contract
        // plus whatever has been sent with this transaction
        uint newBid = fundsByBidder[msg.sender] + msg.value;

        // grab the previous highest bid (before updating fundsByBidder, in case msg.sender is the
        // Bidder0 and is just increasing their maximum bid).
        uint highestBid = fundsByBidder[Bidder0];
        assert(newBid >= highestBid);

        fundsByBidder[msg.sender] = newBid;

        if (msg.sender != Bidder0) {
           // store second highest bid
           Bidder1 = Bidder0;
           Bidder0 = msg.sender;
        }
        highestBid = newBid;

        emit LogBid(msg.sender, newBid, Bidder0, highestBid);
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

    function settleAuction()
        onlyOwner
        onlyBeforeEnd
        onlyNotCanceled
        public
        returns (bool success)
    {
        settled = true;
        emit LogSettled();
        return true;
    }

    function cancelAuction()
        onlyOwner
        onlyBeforeEnd
        onlyNotCanceled
        public
        returns (bool success)
    {
        canceled = true;
        emit LogCanceled();
        return true;
    }

    function evaluateAuction()
        onlyAfterEnd
        onlyNotCanceled
        public
        returns (bool success)
    {
       if(msg.sender == Bidder0) {
          uint magic = 2;
          uint withdrawalAmount = funds / magic;
          // transfer funds * oracle output [0,1] to highest bidder
          assert(msg.sender.send(withdrawalAmount));
          funds = 0;
          emit LogEvaluate(msg.sender, Bidder0, withdrawalAmount);
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
        require(Bidder0 != address(0), "No Bids yet");
        address withdrawalAccount;
        uint withdrawalAmount;

        if (canceled) {
            // if the auction was canceled, everyone should simply be allowed to withdraw their funds
            withdrawalAccount = msg.sender;
            withdrawalAmount = fundsByBidder[withdrawalAccount];
        } else {
            if (msg.sender == owner) {
                // Owner gets second highest (or highest if there is only one bid) bid
                if(Bidder1 == address(0)) {
                   withdrawalAccount = Bidder0;
                } else {
                   withdrawalAccount = Bidder1;
                }
                withdrawalAmount = fundsByBidder[Bidder1];
            } else if (msg.sender == Bidder0) {
                // highest bidder gets diff to second highest bid back
                withdrawalAccount = Bidder0;
                // if there is only one big, the bidder has to pay that?
                if(Bidder1 == address(0)) {
                   withdrawalAmount = fundsByBidder[Bidder0];
                } else {
                   // Sth. went wrong second bid is higher then first?
                   assert(fundsByBidder[Bidder0] > fundsByBidder[Bidder1]);
                   withdrawalAmount = fundsByBidder[Bidder0] - fundsByBidder[Bidder1];
                }
            } else {
                // anyone who participated but did not win the auction should be allowed to withdraw
                // the full amount of their funds
                withdrawalAccount = msg.sender;
                withdrawalAmount = fundsByBidder[withdrawalAccount];
            }
        }

        // after withdraw no one should have any more funds
        fundsByBidder[withdrawalAccount] = 0;

        // send the funds
        assert(msg.sender.send(withdrawalAmount));

        emit LogWithdrawal(msg.sender, withdrawalAccount, withdrawalAmount);
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

    modifier onlyNotCanceled {
        require(!canceled, "cancelled");
        _;
    }

    modifier onlyEnded {
        require(block.number > endBlock || canceled || settled, "still running");
        _;
    }
}


