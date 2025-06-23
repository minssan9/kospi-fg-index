// This collector requires 'cheerio' as a dependency. Make sure it is installed in your backend project.
import axios from 'axios'
import * as cheerio from 'cheerio'

export interface UpbitIndexData {
  date: string
  value: number
}

export async function fetchUpbitIndexData(date: string): Promise<UpbitIndexData> {
  const url = 'https://datalab.upbit.com/indicator'
  const response = await axios.get(url)
  const $ = cheerio.load(response.data)
  // NOTE: Selector may need adjustment based on actual HTML structure
  const valueText = $(".indicator__value").first().text().replace(/[^\d.]/g, '')
  const value = parseFloat(valueText)
  if (isNaN(value)) throw new Error('Failed to parse Upbit index value')
  return { date, value }
} 