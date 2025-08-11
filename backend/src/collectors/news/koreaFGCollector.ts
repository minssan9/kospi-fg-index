import axios from 'axios'
import * as cheerio from 'cheerio'

export interface KoreaFGIndexData {
  date: string
  value: number
}

export async function fetchKoreaFGIndexData(date: string): Promise<KoreaFGIndexData> {
  const url = 'https://kospi-fear-greed-index.co.kr/'
  const response = await axios.get(url)
  const $ = cheerio.load(response.data)
  // NOTE: Selector may need adjustment based on actual HTML structure
  const valueText = $(".fg-index-value").first().text().replace(/[^\d.]/g, '')
  const value = parseFloat(valueText)
  if (isNaN(value)) throw new Error('Failed to parse Korea FG index value')
  return { date, value }
} 