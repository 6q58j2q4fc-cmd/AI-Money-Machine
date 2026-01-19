// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MoneyMachineNFT
 * @dev ERC-721 NFT contract for the MoneyMachine platform
 * Deployed on Polygon Amoy Testnet
 */
contract MoneyMachineNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    uint256 private _tokenIds;

    // Minting price in MATIC (can be set to 0 for free minting)
    uint256 public mintPrice = 0.001 ether;
    
    // Maximum supply (0 = unlimited)
    uint256 public maxSupply = 10000;
    
    // Base URI for metadata
    string private _baseTokenURI;
    
    // Mapping from token ID to creator address
    mapping(uint256 => address) public creators;
    
    // Mapping from token ID to royalty percentage (in basis points, e.g., 250 = 2.5%)
    mapping(uint256 => uint256) public royalties;
    
    // Default royalty percentage
    uint256 public defaultRoyalty = 250; // 2.5%

    // Events
    event NFTMinted(uint256 indexed tokenId, address indexed creator, string tokenURI);
    event NFTBurned(uint256 indexed tokenId, address indexed owner);
    event MintPriceUpdated(uint256 newPrice);
    event BaseURIUpdated(string newBaseURI);

    constructor() ERC721("MoneyMachine NFT", "MMNFT") Ownable(msg.sender) {
        _baseTokenURI = "ipfs://";
    }

    /**
     * @dev Mint a new NFT
     * @param recipient Address to receive the NFT
     * @param tokenURI_ IPFS URI for the token metadata
     * @return tokenId The ID of the newly minted token
     */
    function mintNFT(address recipient, string memory tokenURI_) public payable returns (uint256) {
        require(msg.value >= mintPrice, "Insufficient payment");
        require(maxSupply == 0 || _tokenIds < maxSupply, "Max supply reached");

        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        _safeMint(recipient, newTokenId);
        _setTokenURI(newTokenId, tokenURI_);
        
        creators[newTokenId] = msg.sender;
        royalties[newTokenId] = defaultRoyalty;

        emit NFTMinted(newTokenId, msg.sender, tokenURI_);

        return newTokenId;
    }

    /**
     * @dev Batch mint multiple NFTs
     * @param recipient Address to receive the NFTs
     * @param tokenURIs Array of IPFS URIs for the token metadata
     * @return tokenIds Array of newly minted token IDs
     */
    function batchMint(address recipient, string[] memory tokenURIs) public payable returns (uint256[] memory) {
        require(msg.value >= mintPrice * tokenURIs.length, "Insufficient payment");
        require(maxSupply == 0 || _tokenIds + tokenURIs.length <= maxSupply, "Would exceed max supply");

        uint256[] memory newTokenIds = new uint256[](tokenURIs.length);

        for (uint256 i = 0; i < tokenURIs.length; i++) {
            _tokenIds++;
            uint256 newTokenId = _tokenIds;

            _safeMint(recipient, newTokenId);
            _setTokenURI(newTokenId, tokenURIs[i]);
            
            creators[newTokenId] = msg.sender;
            royalties[newTokenId] = defaultRoyalty;
            
            newTokenIds[i] = newTokenId;

            emit NFTMinted(newTokenId, msg.sender, tokenURIs[i]);
        }

        return newTokenIds;
    }

    /**
     * @dev Owner-only mint (free)
     */
    function ownerMint(address recipient, string memory tokenURI_) public onlyOwner returns (uint256) {
        require(maxSupply == 0 || _tokenIds < maxSupply, "Max supply reached");

        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        _safeMint(recipient, newTokenId);
        _setTokenURI(newTokenId, tokenURI_);
        
        creators[newTokenId] = msg.sender;
        royalties[newTokenId] = defaultRoyalty;

        emit NFTMinted(newTokenId, msg.sender, tokenURI_);

        return newTokenId;
    }

    /**
     * @dev Burn an NFT (only owner of the token can burn)
     */
    function burn(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        _burn(tokenId);
        emit NFTBurned(tokenId, msg.sender);
    }

    /**
     * @dev Update mint price (owner only)
     */
    function setMintPrice(uint256 newPrice) public onlyOwner {
        mintPrice = newPrice;
        emit MintPriceUpdated(newPrice);
    }

    /**
     * @dev Update base URI (owner only)
     */
    function setBaseURI(string memory newBaseURI) public onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    /**
     * @dev Update max supply (owner only)
     */
    function setMaxSupply(uint256 newMaxSupply) public onlyOwner {
        require(newMaxSupply == 0 || newMaxSupply >= _tokenIds, "Cannot set below current supply");
        maxSupply = newMaxSupply;
    }

    /**
     * @dev Update default royalty (owner only)
     */
    function setDefaultRoyalty(uint256 newRoyalty) public onlyOwner {
        require(newRoyalty <= 1000, "Royalty cannot exceed 10%");
        defaultRoyalty = newRoyalty;
    }

    /**
     * @dev Withdraw contract balance (owner only)
     */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        payable(owner()).transfer(balance);
    }

    /**
     * @dev Get total minted count
     */
    function totalMinted() public view returns (uint256) {
        return _tokenIds;
    }

    /**
     * @dev Get royalty info for a token (EIP-2981 compatible)
     */
    function royaltyInfo(uint256 tokenId, uint256 salePrice) public view returns (address, uint256) {
        address creator = creators[tokenId];
        uint256 royaltyAmount = (salePrice * royalties[tokenId]) / 10000;
        return (creator, royaltyAmount);
    }

    // Required overrides for multiple inheritance
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}
