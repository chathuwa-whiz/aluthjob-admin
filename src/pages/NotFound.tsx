import { Link } from 'react-router-dom'
import { usePageTitle } from '../lib/hooks'
import { Empty } from '../ui/Blocks'

export function NotFound() {
  usePageTitle('Not found')

  return (
    <div className="page">
      <Empty title="There is no screen here">
        <Link to="/">Back to the overview</Link>
      </Empty>
    </div>
  )
}
