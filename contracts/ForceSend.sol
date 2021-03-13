pragma solidity >=0.4.22 <0.9.0;

// For test suite
contract ForceSend {
    function go(address payable victim) external payable {
        selfdestruct(victim);
    }
}
