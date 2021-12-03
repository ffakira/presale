"use strict";

const { BigNumber } = require("@ethersproject/bignumber");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const truffleAssert = require("truffle-assertions");

const feeList = [80, 10, 10];
const placeholderURI = "https://a.com/";

/**
 * @dev NFT.sol unit test
 */
describe("NFT contract", function () {
    beforeEach(async function () {
        this.accounts = await ethers.getSigners();
        this.royaltyAccounts = [
            this.accounts[5].address,
            this.accounts[6].address,
            this.accounts[7].address
        ];

        const NFT = await ethers.getContractFactory("NFT");
        const Presale = await ethers.getContractFactory("Presale");

        /**
         * @dev for testing purpose maximum of 5 NFTs are going to be minted.
         */
        this.presale = await Presale.deploy(
            BigNumber.from("5"),
            BigNumber.from(ethers.utils.parseEther("0.1")),
        );

        /**
         * @TODO refactor the placeholder image
         */
        this.nft = await NFT.deploy(
            this.presale.address,
            BigNumber.from("30"),
            placeholderURI,
            this.royaltyAccounts,
            feeList
        );
    });

    async function depositX(accounts, presale, total = 5) {
        if (total <= 0 || total > 10) throw new Error("Invalid length account (range 1..10)");
        const mintPrice = await presale.mintPrice();

        accounts.forEach(async (account, i) => {
            if (i < total) await presale.connect(account).deposit({ value: mintPrice });
        });
    }

    /**
     * @TODO implement shuffle mechanism
     */
    it("should allow user to mint an NFT", async function () {
        await depositX(this.accounts, this.presale);

        await this.nft.connect(this.accounts[0]).mint();
        const tokenId = await this.nft.userTokenId(this.accounts[0].address);
        expect(tokenId.eq(BigNumber.from("0")));
    });

    accounts.forEach(function (account, i) {
        if (i < 3) {
            it(`should get account #${i} correct fee`, async function () {
                const _account = await this.nft.royaltyList(account);
                expect(_account.fee.eq(BigNumber.from(feeList[i])));
            });
        }
    });

    it("should get royalty fee for all 3 accounts unclaimed", async function() {
        await depositX(this.accounts, this.presale);
        await this.nft.connect(this.accounts[0]).mint();

        /**
         * @dev map all fees to BN and calculate the fees
         * according to solidity version.
         */
        this.royaltyAccounts.forEach(async (account, i) => {
            const mintPrice = await this.presale.mintPrice();
            let bnFees = BigNumber.from(mintPrice).mul(feeList[i]).div(BigNumber.from("100"));

            let royaltyList = await this.nft.royaltyList(account);
            expect(bnFees.eq(royaltyList["unclaimed"]));
        });
    });

    it("should set a new uri", async function() {
        await this.nft.connect(this.accounts[0]).setURI("https://b.com/{id}.json");
        const getURI = await this.nft.uri(BigNumber.from("0"));

        expect(getURI === "https://b.com/{id}.json");
    });

    it("should fail to mint an NFT, if the presale didn't finish", async function () {
        const mintPrice = await this.presale.mintPrice();
        await this.presale.connect(this.accounts[0]).deposit({ value: mintPrice });

        await truffleAssert.fails(
            this.nft.connect(this.accounts[0]).mint(),
            "NFT: You can only mintn after the presale ends."
        );
    });

    it("should fail to mint an NFT, if the user didn't join presale", async function () {
        await depositX(this.accounts, this.presale);
        await truffleAssert.fails(
            this.nft.connect(this.accounts[5]).mint(),
            "NFT: You have not joined presale."
        );
    });

    it("should fail if deployer does not set the uri", async function() {
        await truffleAssert.fails(
            this.nft.connect(this.accounts[1]).setURI("https://b.com/${id}.json"),
            "Ownable: caller is not the owner"
        );
    });

    it("should fail, if royalty user tries to claim no ether", async function () {
        await truffleAssert.fails(
            this.nft.connect(this.accounts[5]).claim(),
            "Presale: There is nothing be claimed."
        );
    });
});
