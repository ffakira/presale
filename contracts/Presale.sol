// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Presale is Ownable, ReentrancyGuard {
    uint256 public mintPrice = 0.1 ether;
    uint256 public totalRoyaltyMembers = 0;
    bool public isPresale = true; 

    event TransferEther(uint256 amount, address user);
    event AddRoyalty(uint256 fee, address user);

    struct Whitelist {
        uint256 amount;
        uint256 id;
        bool isVerified;
    }

    struct RoyaltyList {
        uint256 id;
        uint256 fee;
        uint256 unclaimed;
        uint256 claimed;
        bool isVerified;
    }

    Whitelist[] totalMembers;
    mapping(address => RoyaltyList) public royaltyList;
    mapping(address => Whitelist) public whitelist;

    constructor(uint256 _mintPrice, address[] memory _addresses, uint256[] memory _fee) {
        mintPrice = _mintPrice;

        for (uint256 i = 0; i < _addresses.length; i++) {
            _addFeeHandler(i, _addresses[i], _fee[i]);
            totalRoyaltyMembers++;
        }
    }

    function _addFeeHandler(uint256 _id, address _address, uint256 _fee) internal {
        royaltyList[_address].id = _id;
        royaltyList[_address].fee = _fee;
        royaltyList[_address].isVerified = true;

        emit AddRoyalty(_fee, _address);
    }

    receive() external payable {}
    fallback() external payable {}

    function deposit() public payable nonReentrant {
        require(!(whitelist[_msgSender()].amount >= 0.1 ether), "Presale: You already deposit 0.1 ETH.");
        require(totalMembers.length < 10000, "Presale: 10,000 positions have been reserved.");

        (bool sent,) = payable(address(this)).call{value: mintPrice}("");
        require(msg.value >= 0.1 ether, "Presale: 0.1 ETH to mint.");
        require(sent, "Presale: failed to transfer ether.");

        uint256 _ids = totalMembers.length;

        whitelist[_msgSender()] = Whitelist(msg.value, _ids, true);
        totalMembers.push(whitelist[_msgSender()]);

        if (totalMembers.length == 10000) isPresale = false;
        emit TransferEther(mintPrice, _msgSender());
    }

    function refund() public payable nonReentrant {
        require(isPresale, "Presale: You can only claim after the presale ends.");
        require(!(whitelist[_msgSender()].amount == 0), "Presale: There is nothing to be withdrawn.");
        
        (bool sent,) = payable(_msgSender()).call{value: whitelist[_msgSender()].amount}("");
        require(sent, "Presale: failed to transfer ether.");

        whitelist[_msgSender()].isVerified = false;

        emit TransferEther(mintPrice, _msgSender());
        whitelist[_msgSender()].amount = 0;
    }

    function getEtherBalance() public view returns(uint256) {
        return address(this).balance;
    }

    function getAmount(address _caller) external view returns(uint256){
        return whitelist[_caller].amount;
    }

    function getTotalMembers() external view returns(Whitelist[] memory){
        return totalMembers;
    }
}
