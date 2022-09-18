const { ethers } = require("hardhat")

const networkConfig = {
    4:{
        name:"goerli",
        keepersUpdateInterval:"30",
        vrfCoordinatorV2:"0x271682DEB8C4E0901D1a1550aD2e64D568E69909",
        entranceFee: ethers.utils.parseEther("0.01"),
        gasLane:"0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        subscriptionId : "6926",
        callbackGasLimit:"500000", //500,000 gas
    },
    31337:{
        name:"hardhat",
        entranceFee: ethers.utils.parseEther("0.01"),
        gasLane:"0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        keepersUpdateInterval: "30",
        callbackGasLimit: "500000", //500,000 gas
    }

}
const developmentChains = ["hardhat","localhost"]

module.exports ={
    networkConfig,
    developmentChains
}