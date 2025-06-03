import { BigNumber } from '@ethersproject/bignumber'
import { formatUnits } from '@ethersproject/units'
import { Trans } from '@lingui/macro'
import { TokenInfo } from '@uniswap/token-lists'
import { ButtonLight, ButtonPrimary } from 'components/Button'
import React, { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components/macro'

import { UZH_LIST } from '../../constants/lists'
import { useFaucetContract } from '../../hooks/useContract'
import { useFetchListCallback } from '../../hooks/useFetchListCallback'
import { useActiveWeb3React } from '../../hooks/web3'
import { useWalletModalToggle } from '../../state/application/hooks'
import { addTokenToMetamask } from '../../utils/addTokenToMetamask'

const PageWrapper = styled.div`
  max-width: 870px;
  width: 100%;
  margin: 2rem auto;
  padding: 1rem;
  background: ${({ theme }) => theme.bg0};
  border-radius: 1rem;
`

const FormWrapper = styled.div`
  width: 100%;
  position: relative;
  background: ${({ theme }) => theme.bg1};
  padding: 1.5rem;
  border-radius: 1.25rem;
  box-shadow: ${({ theme }) => theme.bg0};
`

const TokenImportLink = styled.span`
  color: ${({ theme }) => theme.primary1};
  text-decoration: underline;
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
`

const Title = styled.h2`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.text1};
  font-size: 1.5rem;
  text-align: center;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  justify-content: space-between;
`

const Label = styled.label`
  font-size: 1rem;
  color: ${({ theme }) => theme.text1};
`

const Select = styled.select`
  flex: 1;
  margin-left: 0.75rem;
  padding: 0.5rem;
  background: ${({ theme }) => theme.bg2};
  color: ${({ theme }) => theme.text1};
  border: 1px solid ${({ theme }) => theme.bg3};
  border-radius: 0.5rem;
  font-size: 1rem;
`

const InfoText = styled.div`
  font-size: 1rem;
  color: ${({ theme }) => theme.text2};
  margin-bottom: 1rem;
`

const StatusMessage = styled.div<{ error?: boolean }>`
  font-size: 0.9rem;
  color: ${({ error, theme }) => (error ? theme.red1 : theme.green1)};
  margin-top: 0.75rem;
  text-align: center;
`

const CooldownTimer = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.primary1};
`

const Faucet = (): React.ReactElement => {
  const { account } = useActiveWeb3React()
  const faucetContract = useFaucetContract()
  const fetchTokenList = useFetchListCallback()
  const toggleWalletModal = useWalletModalToggle()
  const [tokenList, setTokenList] = useState<TokenInfo[]>()
  const [selectedToken, setSelectedToken] = useState<TokenInfo | undefined>(undefined)

  // fetch token list
  useEffect(() => {
    fetchTokenList(UZH_LIST, false).then((list) => {
      setTokenList(list.tokens)
      setSelectedToken(list.tokens[0])
    })
  }, [fetchTokenList, setTokenList, setSelectedToken])

  const [amountPerClaim, setAmountPerClaim] = useState<BigNumber | null>(null)
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0)
  const [nextRequestAt, setNextRequestAt] = useState<number>(0)
  const [isClaiming, setIsClaiming] = useState<boolean>(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [isError, setIsError] = useState<boolean>(false)

  const fetchFaucetData = useCallback(async () => {
    if (!faucetContract || !account) return
    try {
      const amount: BigNumber = await faucetContract.getTokenAmountPerClaim()
      setAmountPerClaim(amount)

      const cooldown: BigNumber = await faucetContract.getCooldown()
      setCooldownSeconds(cooldown.toNumber())

      const next: BigNumber = await faucetContract.nextRequestAt(account)
      setNextRequestAt(next.toNumber())
    } catch (err) {
      console.error('Error fetching faucet data:', err)
      setStatusMsg('Failed to load faucet data.')
      setIsError(true)
    }
  }, [faucetContract, account])

  // Fetch whenever wallet connects or contract changes
  useEffect(() => {
    if (account && faucetContract) {
      fetchFaucetData()
    } else {
      setAmountPerClaim(null)
      setCooldownSeconds(0)
      setNextRequestAt(0)
      setStatusMsg(null)
      setIsError(false)
    }
  }, [account, faucetContract, fetchFaucetData])

  // time remaining until next fetch possible
  const [secondsRemaining, setSecondsRemaining] = useState(0)

  const computeRemaining = useCallback(() => {
    if (!account || nextRequestAt === 0 || cooldownSeconds === 0) {
      return 0
    }
    const now = Math.floor(Date.now() / 1000)
    const availableAt = nextRequestAt
    return availableAt > now ? availableAt - now : 0
  }, [account, nextRequestAt, cooldownSeconds])

  useEffect(() => {
    setSecondsRemaining(computeRemaining())
    const intervalId = setInterval(() => {
      setSecondsRemaining(computeRemaining())
    }, 1000)
    return () => {
      clearInterval(intervalId)
    }
  }, [computeRemaining])

  const handleClaim = useCallback(async () => {
    if (!faucetContract || !account || !selectedToken) return
    setStatusMsg(null)
    setIsError(false)

    // Return early if not yet possible to request
    if (secondsRemaining > 0) {
      setStatusMsg(`Please wait ${secondsRemaining}s to claim again.`)
      setIsError(true)
      return
    }

    try {
      setIsClaiming(true)
      const tx = await faucetContract.mint(selectedToken.address, {
        // no value needed
      })
      setStatusMsg('Transaction submitted - waiting for confirmation...')
      await tx.wait()

      setStatusMsg(
        `Successfully claimed ${formatUnits(amountPerClaim || 0, selectedToken.decimals)} ${selectedToken.symbol}`
      )
      setIsError(false)
      await fetchFaucetData()
    } catch (err: any) {
      console.error('Claim error:', err)
      if (err.reason) {
        setStatusMsg(`${err.reason}`)
      } else {
        setStatusMsg('Transaction failed')
      }
      setIsError(true)
    } finally {
      setIsClaiming(false)
    }
  }, [account, faucetContract, selectedToken, amountPerClaim, secondsRemaining, fetchFaucetData])

  return (
    <PageWrapper>
      <Title>Token Faucet</Title>
      <FormWrapper>
        {selectedToken && tokenList ? (
          <>
            <Row>
              <Label htmlFor="token-select">Token:</Label>
              <Select
                id="token-select"
                value={selectedToken.address}
                onChange={(e) => {
                  const tok = tokenList.find((t) => t.address === e.target.value)
                  if (tok) setSelectedToken(tok)
                }}
              >
                {tokenList.map((tok) => (
                  <option key={tok.address} value={tok.address}>
                    {tok.symbol}
                  </option>
                ))}
              </Select>
            </Row>

            {amountPerClaim !== null && cooldownSeconds > 0 ? (
              <InfoText>
                <strong>How it works:</strong> You can send a request to the faucet every{' '}
                <strong>{cooldownSeconds}s</strong> to claim{' '}
                <strong>
                  {formatUnits(amountPerClaim, selectedToken.decimals)} {selectedToken.symbol}
                </strong>
                . If you haven’t already done so,{' '}
                <TokenImportLink
                  onClick={async () => {
                    if (!selectedToken) return
                    const wasAdded = await addTokenToMetamask(
                      selectedToken.address,
                      selectedToken.symbol,
                      selectedToken.decimals,
                      selectedToken.logoURI
                    )
                    if (wasAdded) {
                      alert(`${selectedToken.symbol} has been added to MetaMask!`)
                    }
                  }}
                >
                  import the token into MetaMask
                </TokenImportLink>
                . Once the transaction succeeds, the claimed tokens will appear in your MetaMask wallet.
              </InfoText>
            ) : (
              <InfoText>Loading faucet information…</InfoText>
            )}
          </>
        ) : (
          <>Error: Failed to fetch token List</>
        )}
        {account && (
          <InfoText>
            {secondsRemaining > 0 ? (
              <>
                <span>Next claim in </span>
                <CooldownTimer>{secondsRemaining}s</CooldownTimer>
              </>
            ) : (
              <span>You can claim now</span>
            )}
          </InfoText>
        )}

        <Row>
          {!account ? (
            <ButtonLight onClick={toggleWalletModal}>
              <Trans>Connect Wallet</Trans>
            </ButtonLight>
          ) : (
            <ButtonPrimary onClick={handleClaim} disabled={!account || isClaiming || secondsRemaining > 0}>
              {isClaiming ? 'Claiming…' : 'Claim Tokens'}
            </ButtonPrimary>
          )}
        </Row>
        {statusMsg && <StatusMessage error={isError}>{statusMsg}</StatusMessage>}
      </FormWrapper>
    </PageWrapper>
  )
}

export default Faucet
