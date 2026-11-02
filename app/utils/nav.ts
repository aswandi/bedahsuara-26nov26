export interface NavItem {
  label: string
  to?: string
  soon?: boolean
  children?: NavItem[]
}

const kontes = (tahun: number): NavItem[] => [
  { label: 'Pilpres', to: `/pemilu/${tahun}/pilpres` },
  { label: 'DPD', to: `/pemilu/${tahun}/dpd` },
  { label: 'DPR RI', to: `/pemilu/${tahun}/dpr-ri` },
  { label: 'DPRD Provinsi', to: `/pemilu/${tahun}/dprd-provinsi` },
  { label: 'DPRD Kabupaten/Kota', to: `/pemilu/${tahun}/dprd-kabkota` }
]

export const navItems: NavItem[] = [
  { label: 'Beranda', to: '/' },
  { label: 'Pemilu 2019', children: kontes(2019) },
  { label: 'Pemilu 2024', children: kontes(2024) },
  {
    label: 'Pilkada 2024',
    children: [
      { label: 'Pilgub', to: '/pilkada/2024/pilgub' },
      { label: 'Pilkada (Bupati/Walikota)', to: '/pilkada/2024/pilkada' }
    ]
  },
  {
    label: 'Profil Dapil',
    children: [
      { label: 'Pilpres', soon: true },
      { label: 'DPD', soon: true },
      { label: 'DPR RI', to: '/profil-dapil/dpr-ri' },
      { label: 'DPRD Provinsi', soon: true },
      { label: 'DPRD Kabupaten/Kota', soon: true }
    ]
  },
  { label: 'Analisa', soon: true },
  { label: 'Strategi Kampanye', soon: true }
]
