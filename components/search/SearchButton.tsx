import { KBarButton } from './KBarButton'
import { SearchIcon } from './icons'

const SearchButton = () => {
  return (
    <KBarButton aria-label="Search">
      <SearchIcon className="h-6 w-6 text-gray-900 dark:text-gray-100" />
    </KBarButton>
  )
}
export default SearchButton
