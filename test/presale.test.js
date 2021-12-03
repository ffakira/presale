"use strict";

const { BigNumber } = require("@ethersproject/bignumber");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const truffleAssert = require("truffle-assertions");

/**
 * @dev Presale.sol unit test
 */
describe("Presale contract", function () {
    beforeEach(async function () {
        this.accounts = await ethers.getSigners();
        const Presale = await ethers.getContractFactory("Presale");

        /**
         * @dev for testing purpose maximum of 5 NFTs are going to be minted.
         */
        this.presale = await Presale.deploy(
            BigNumber.from("5"),
            BigNumber.from(ethers.utils.parseEther("0.1")),
        );
    });

    it("should get 0.1 ETH mint price", async function () {
        const mintPrice = await this.presale.mintPrice();
        expect(ethers.utils.parseEther("0.1").eq(mintPrice));
    });

    it("should deposit 0.1 ETH and increase totalMembers", async function () {
        // 1) deposit
        const mintPrice = await this.presale.mintPrice();
        await this.presale.deposit({ value: mintPrice });

        const contractBalance = await this.presale.getEtherBalance();
        expect(mintPrice.eq(contractBalance));

        // 2) check `totalMembers` length to be 1
        const totalMembers = await this.presale.getTotalMembers();
        expect(totalMembers.length === 1);
    });

    it("should allow users to refund after presale ends", async function () {
        const mintPrice = await this.presale.mintPrice();
        let total = 0;

        // 1) Deposit 0.1 eth for 5 accounts (id 0 to 4)
        for (let account of this.accounts) {
            if (total < 5) {
                await this.presale.connect(account).deposit({ value: mintPrice });
            }
            total++;
        }
        
        // 2) Check if the id is 4 (last index)
        expect((await this.presale.whitelist(this.accounts[4].address))["id"].eq(BigNumber.from("4")));
        
        // 3) refund the account
        await this.presale.connect(this.accounts[0]).refund();
        const contractBalance = (await this.presale.whitelist(this.accounts[0].address))["amount"];

        // 4) check the balance is 0
        expect(contractBalance.eq(BigNumber.from("0")));

        // 5) check the if the last element, went to the correct index of the refund user
        expect((await this.presale.whitelist(this.accounts[4].address))["id"].eq(BigNumber.from("0")));

        // 6) check the refunded user `isVerified` is set to false
        expect((await this.presale.whitelist(this.accounts[0].address))["isVerified"] === false);

        // 7) check the last user index `isVerified` is set to true
        expect((await this.presale.whitelist(this.accounts[4].address))["isVerified"] === true);

    });

    it("should getAmount if the user deposited ether", async function() {
        const mintPrice = await this.presale.mintPrice();
        await this.presale.connect(this.accounts[0]).deposit({value: mintPrice});

        const getAmount = await this.presale.getAmount(this.accounts[0].address);

        // 1) check user0 deposit eth
        expect(mintPrice.eq(getAmount));

        // 2) check user1 who didn't deposit eth
        const getAmount1 = await this.presale.getAmount(this.accounts[1].address);
        expect(getAmount1.eq(BigNumber.from("0")));
    });

    it("should fail, if the user deposits more than 0.1 ETH", async function () {
        await truffleAssert.fails(
            this.presale.deposit({
                value: ethers.utils.parseEther("0.2")
            }),
            "Presale: 0.1 ETH to mint."
        );
    });

    it("should fail, if the user tries to deposit less than 0.1 ETH", async function () {
        await truffleAssert.fails(
            this.presale.deposit({
                value: ethers.utils.parseEther("0.2")
            }),
            "Presale: 0.1 ETH to mint."
        );
    });

    it("should fail, if the user tries to deposit twice", async function () {
        // 1) first deposit
        const mintPrice = await this.presale.mintPrice();
        await this.presale.deposit({ value: mintPrice });

        // 2) second deposit fails
        await truffleAssert.fails(
            this.presale.deposit({ value: mintPrice }),
            "Presale: You already deposit 0.1 ETH."
        );
    });

    it("should fail, if the presale has not ended", async function () {
        await truffleAssert.fails(
            this.presale.refund(),
            "Presale: You can only claim after the presale ends."
        );
    });

    it("should fail, if user didn\'t deposit ether", async function () {
        const mintPrice = await this.presale.mintPrice();
        let total = 0;

        for (let account of this.accounts) {
            if (total < 5) {
                await this.presale.connect(account).deposit({ value: mintPrice });
            }
            total++;
        }

        await truffleAssert.fails(
            this.presale.connect(this.accounts[5]).refund(),
            "Presale: There is nothing to be withdrawn."
        );
    });

    it("should fail, if user tries to deposit after all positions are taken", async function () {
        const mintPrice = await this.presale.mintPrice();
        let total = 0;

        for (let account of this.accounts) {
            if (total < 5) await this.presale.connect(account).deposit({ value: mintPrice });
            if (total == 6) {
                await truffleAssert.fails(
                    this.presale.connect(account).deposit({ value: mintPrice }),
                    "Presale: 10,000 positions have been reserved."
                );
            }
            total++;
        }
    });
});
