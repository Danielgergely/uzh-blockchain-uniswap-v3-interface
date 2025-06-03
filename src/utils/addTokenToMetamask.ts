export async function addTokenToMetamask(
  tokenAddress: string,
  tokenSymbol: string,
  tokenDecimals: number,
  tokenImage?: string
): Promise<boolean> {
  const provider: any = (window as any).ethereum
  if (!provider || typeof provider.request !== 'function') {
    console.warn("No injected Web3 provider with 'request' found.")
    return false
  }

  try {
    return await provider.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: tokenAddress,
          symbol: tokenSymbol,
          decimals: tokenDecimals,
          image: tokenImage || '',
        },
      },
    })
  } catch (error) {
    console.error('Failed to call wallet_watchAsset:', error)
    return false
  }
}
