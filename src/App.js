import React from 'react';
import {useEffect,useState} from 'react';
import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';
import { networks } from './utils/networks';
import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import {ethers} from "ethers";
import contractAbi from "./utils/contractabi.json";
// Constants
const TWITTER_HANDLE = 'hadat_industries';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const tld = ".fly";
const CONTRACT_ADDRESS = "0xDf1aBB2870a8247ca285db4dB275EA9c74e5Cb1A";


const App = () => {
	const [currentAccount,setCurrentAccount] = useState('');	const [editing,setEditing] = useState(false);
	const [domain,setDomain] = useState('');
	const [record,setRecord] = useState('');
	const [network,setNetwork] = useState('');
	const [mints,setMints] = useState([]);
	const [loading,setLoading] = useState(false);
	const fetchMints = async()=> {
		try {
			const {ethereum} = window;
			if(ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();

				const contract = new ethers.Contract(CONTRACT_ADDRESS,contractAbi.abi,signer);

				const names = await contract.getAllNames();

				const mintRecords = await Promise.all(names.map(async(name)=>{
					const mintRecord = await contract.getRecord(name);
					const owner = await contract.getAddress(name);

					return {
						id: names.indexOf(name),
						name: name,
						record: mintRecord,
						owner: owner,
					};
				}));

				console.log("Fetched mint records");
				setMints(mintRecords);
			}
		} catch(err) {
			console.log(err);
		}
	}

	useEffect(()=>{
		if (network === 'Polygon Mumbai Testnet') {
		fetchMints();
	}
	},[currentAccount,network])
	const connectWallet = async()=> {
		try {
			const {ethereum} = window;
			if(!ethereum) {
				alert("Get metamask wallet from browser extension store");
				return
			}

			const accounts = await ethereum.request({method:"eth_requestAccounts"});
			console.log("Connected account ",accounts[0]);
			setCurrentAccount(accounts[0]);
		} catch(err) {
			console.log(err)
		}
	}

	const switchNetwork = async () => {
	if (window.ethereum) {
		try {
			// Try to switch to the Mumbai testnet
			await window.ethereum.request({
				method: 'wallet_switchEthereumChain',
				params: [{ chainId: '0x2161' }], // Check networks.js for hexadecimal network ids
			});
		} catch (error) {
			// This error code means that the chain we want has not been added to MetaMask
			// In this case we ask the user to add it to their MetaMask
			if (error.code === 4902) {
				try {
					await window.ethereum.request({
						method: 'wallet_addEthereumChain',
						params: [
							{	
								chainId: '0x2161',
								chainName: 'Polygon Mumbai Testnet',
								rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
								nativeCurrency: {
										name: "Mumbai Matic",
										symbol: "MATIC",
										decimals: 18
								},
								blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
							},
						],
					});
				} catch (error) {
					console.log(error);
				}
			}
			console.log(error);
		}
	} else {
		// If window.ethereum is not found then MetaMask is not installed
		alert('MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html');
	} 
}

	const checkIfWalletIsConnected = async() => {
		const {ethereum} = window;

		if(!ethereum) {
			console.log("No ethereum object found")
			return
		} else {
			console.log("Ethereum object found ", ethereum);
		}

		const accounts = await ethereum.request({method:"eth_requestAccounts"});
		if(accounts.length!==0) {
			const account = accounts[0];
			console.log("Found an authorised account ",account);
			setCurrentAccount(account);
		} else {
			console.log("No authorised account found")
		}
		const chainId = await ethereum.request({ method: 'eth_chainId' });
		setNetwork(networks[chainId]);

		ethereum.on('chainChanged', handleChainChanged);
		
		// Reload the page when they change networks
		function handleChainChanged(_chainId) {
			window.location.reload();
		}

	}
	const mintDomain = async () => {
	// Don't run if the domain is empty
	if (!domain) { return }
	// Alert the user if the domain is too short
	if (domain.length < 3) {
		alert('Domain must be at least 3 characters long');
		return;
	}
	// Calculate price based on length of domain (change this to match your contract)	
	// 3 chars = 0.5 MATIC, 4 chars = 0.3 MATIC, 5 or more = 0.1 MATIC
	const price = domain.length === 3 ? '0.5' : domain.length === 4 ? '0.3' : '0.1';
	console.log("Minting domain", domain, "with price", price);
  try {
    const { ethereum } = window;
    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

			console.log("Going to pop wallet now to pay gas...")
      let tx = await contract.register(domain, {value: ethers.utils.parseEther(price)});
      // Wait for the transaction to be mined
			const receipt = await tx.wait();

			// Check if the transaction was successfully completed
			if (receipt.status === 1) {
				console.log("Domain minted! https://mumbai.polygonscan.com/tx/"+tx.hash);
				
				// Set the record for the domain
				tx = await contract.setRecord(domain, record);
				await tx.wait();

				console.log("Record set! https://mumbai.polygonscan.com/tx/"+tx.hash);
				setTimeout(()=>{
					fetchMints();
				},2000);
				setRecord('');
				setDomain('');
			}
			else {
				alert("Transaction failed! Please try again");
			}
    }
  }
  catch(error){
    console.log(error);
  }
}
const updateDomain = async () => {
	if (!record || !domain) { return }
	setLoading(true);
	console.log("Updating domain", domain, "with record", record);
  	try {
		const { ethereum } = window;
		if (ethereum) {
			const provider = new ethers.providers.Web3Provider(ethereum);
			const signer = provider.getSigner();
			const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

			let tx = await contract.setRecord(domain, record);
			await tx.wait();
			console.log("Record set https://mumbai.polygonscan.com/tx/"+tx.hash);

			fetchMints();
			setRecord('');
			setDomain('');
		}
  	} catch(error) {
    	console.log(error);
  	}
	setLoading(false);
}


		const renderInputForm = () => {
		/*	if (network !== 'Polygon Mumbai Testnet') {
		return (
			<div className="connect-wallet-container">
				<p>Please connect to the Polygon Mumbai Testnet</p>
				<button className='cta-button mint-button' onClick={switchNetwork}>Click here to switch</button>
			</div>
		);
	}*/
			return (
			<div className="form-container">
				<div className="first-row">
					<input
						type="text"
						value={domain}
						placeholder='domain'
						onChange={e => setDomain(e.target.value)}
					 id="domain-input" />
					<p>{tld}</p>
				</div>
				<input
					type="text"
					value={record}
					placeholder='Add a record'
					onChange={e => setRecord(e.target.value)}
				/>
				{editing ? (
						<div className="button-container">
							<button className='cta-button mint-button' disabled={loading} onClick={updateDomain}>
								Set record
							</button>  
							<button className='cta-button mint-button' onClick={() => {setEditing(false)}}>
								Cancel
							</button>  
						</div>
					) : (
						// If editing is not true, the mint button will be returned instead
					<div className="btn-container">
						<button className='cta-button mint-button' disabled={loading} onClick={mintDomain}>
							Mint
						</button>  
					</div>
					)}
			</div>
		);
		}
		const renderMints = () => {
	if (currentAccount && mints.length > 0) {
		return (
			<div className="mint-container">
				<p className="subtitle"> Recently minted domains!</p>
				<div className="mint-list">
					{ mints.map((mint, index) => {
						return (
							<div className="mint-item" key={index}>
								<div className='mint-row'>
									<a className="link" href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`} target="_blank" rel="noopener noreferrer">
										<p className="underlined">{' '}{mint.name}{tld}{' '}</p>
									</a>
									{/* If mint.owner is currentAccount, add an "edit" button*/}
									{ mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
										<button className="edit-button" onClick={() => editRecord(mint.name)}>
											<img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
										</button>
										:
										null
									}
								</div>
					<p> {mint.record} </p>
				</div>)
				})}
			</div>
		</div>);
	}
};

// This will take us into edit mode and show us the edit buttons!
const editRecord = (name) => {
	console.log("Editing record for", name);
	setEditing(true);
	setDomain(name);
}

	const renderNotConnectedContainer = () => (
		<div className="connect-wallet-container">
			<img src="http://localhost:3000/78nE.gif" alt="Ninja gif" />
			<button onClick={connectWallet} className="cta-button connect-wallet-button">
				Connect Wallet
			</button>
		</div>
  	);


	useEffect(()=>{
		checkIfWalletIsConnected()
	},[])
  return (
		<div className="App">
			<div className="container">

				<div className="header-container">
					<header>
            <div className="title-div">
              <h1 className="title">🦅 Fly Name Service</h1>
              <p className="subtitle">Get your one time domain that lives forever</p>
            </div>
            <div className="logo-div">
			<img alt="Network logo" className="logo" src={ network.includes("Polygon") ? polygonLogo : ethLogo} />
			{ currentAccount ? <p> Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} </p> : <p> Not connected </p> }
		</div>
					</header>
				</div>
				
				{currentAccount?renderInputForm():renderNotConnectedContainer()}
				{mints && renderMints()}
        <div className="footer-container">
					<img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
					<a
						className="footer-text"
						href={TWITTER_LINK}
						target="_blank"
						rel="noreferrer"
					>{`built by @${TWITTER_HANDLE}`} In cooperation with @rabbitsden101</a>
				</div>
			</div>
		</div>
	);
}

export default App;
