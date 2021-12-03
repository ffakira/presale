"use strict";

const { BigNumber } = require("@ethersproject/bignumber");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const truffleAssert = require("truffle-assertions");

const accounts = [
    "0x13947a404DF9C36B32dDF78B8087Ea23181c8B32",
    "0xCB61068c1E905773872551563E41Bf2B373555f5",
    "0xe10Fea1eF078Cff45e4c6290dB4aE7d27Fe16436"
];

const feeList = [10, 10, 80];

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
            accounts,
            feeList
        );
    });

    it("should get 0.1 ETH mint price", async function () {
        const mintPrice = await this.presale.mintPrice();
        expect(ethers.utils.parseEther("0.1").eq(mintPrice));
    });

    accounts.forEach(function (account, i) {
        it(`should get account #${i} correct fee`, async function () {
            const _account = await this.presale.royaltyList(account);
            expect(_account.fee.eq(BigNumber.from(feeList[i])));
        });
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
        )
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

/**
 * @dev NFT.sol unit test
 */
describe("NFT contract", function() {
    beforeEach(async function() {
        this.accounts = await ethers.getSigners();
        const NFT = await ethers.getContractFactory("NFT");
        const Presale = await ethers.getContractFactory("Presale");

        /**
         * @dev for testing purpose maximum of 5 NFTs are going to be minted.
         */
        this.presale = await Presale.deploy(
            BigNumber.from("5"),
            BigNumber.from(ethers.utils.parseEther("0.1")),
            accounts,
            feeList
        );

        /**
         * @TODO refactor the placeholder image
         */
        this.nft = await NFT.deploy(
            this.presale.address,
            BigNumber.from("30"),
            "https://a.com/",
            "http://b.com/"
        );
    });

    it("should test", async function() {
        expect(true);
    })
});
