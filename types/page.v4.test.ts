import type { PageHeaderActionV4, PageMetadataV4 } from './page.v4.js'
const guest: PageHeaderActionV4 = {
  id: 'account',
  label: { key: 'guest', fallback: 'Anonymous guest' },
  visual: { kind: 'avatar' },
  menu: [{ id: 'profile', label: { key: 'profile' }, command: { id: 'profile' } }],
}
const page: PageMetadataV4 = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/page.v4.schema.json',
  schemaVersion: 4,
  id: 'lobby',
  title: { key: 'title' },
  description: { key: 'description' },
  contentInset: 'none',
  headerActions: [guest],
}
// @ts-expect-error a trigger cannot both open a menu and dispatch a command
const invalid: PageHeaderActionV4 = { id: 'both', label: { key: 'x' }, command: { id: 'x' }, menu: [] }
void [page, invalid]

const primary: PageHeaderActionV4 = {
  id: 'create',
  label: { key: 'create' },
  command: { id: 'create' },
  presentation: 'primary',
}
// @ts-expect-error menu triggers cannot claim primary command presentation
const primaryMenu: PageHeaderActionV4 = { id: 'account', label: { key: 'account' }, menu: [], presentation: 'primary' }
void [primary, primaryMenu]

// @ts-expect-error arbitrary CSS values are not page layout metadata
const invalidInset: PageMetadataV4 = { ...page, contentInset: '16px' }
void invalidInset

const outlined: PageHeaderActionV4 = { ...primary, presentation: 'primary', variant: 'outlined' }
// @ts-expect-error outlined requires explicit primary presentation
const outlinedIcon: PageHeaderActionV4 = { id: 'x', label: { key: 'x' }, command: { id: 'x' }, variant: 'outlined' }
// @ts-expect-error menu triggers cannot claim outlined primary styling
const outlinedMenu: PageHeaderActionV4 = { ...guest, variant: 'outlined' }
// @ts-expect-error arbitrary variants are not public action styling
const arbitraryVariant: PageHeaderActionV4 = { ...primary, presentation: 'primary', variant: 'filled' }
void [outlined, outlinedIcon, outlinedMenu, arbitraryVariant]

const balance: PageHeaderActionV4 = {
  id: 'balance',
  label: { key: 'balance' },
  command: { id: 'ledger' },
  presentation: 'text',
}
// @ts-expect-error text commands cannot use identity visuals
const textAvatar: PageHeaderActionV4 = { ...balance, presentation: 'text', visual: { kind: 'avatar' } }
// @ts-expect-error text commands cannot claim the primary outlined variant
const textOutlined: PageHeaderActionV4 = { ...balance, presentation: 'text', variant: 'outlined' }
// @ts-expect-error menu triggers cannot use text presentation
const textMenu: PageHeaderActionV4 = { ...guest, presentation: 'text' }
void [balance, textAvatar, textOutlined, textMenu]
