import { getDashboardData } from '../repositories/dashboard'

export default defineEventHandler(async () => {
  return await getDashboardData()
})
