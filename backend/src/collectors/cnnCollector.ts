import axios from 'axios'
import * as cheerio from 'cheerio'

export interface CnnFearGreedIndexData {
  date: string
  value: number
}

export async function fetchCnnFearGreedIndexData(date: string): Promise<CnnFearGreedIndexData> {
  const url = 'https://edition.cnn.com/markets/fear-and-greed'
  const response = await axios.get(url)
  const $ = cheerio.load(response.data)
  // NOTE: Selector may need adjustment based on actual HTML structure
  const valueText = $(".FearGreedGraph__Dial__Value-sc-1v2maoc-2").first().text().replace(/[^\d.]/g, '')
  const value = parseFloat(valueText)
  if (isNaN(value)) throw new Error('Failed to parse CNN Fear & Greed index value')
  return { date, value }
} 