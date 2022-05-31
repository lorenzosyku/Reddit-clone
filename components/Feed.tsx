import { useQuery } from '@apollo/client'
import React from 'react'
import { GET_ALL_POSTS } from '../graphql/queries'


function Feed() {
  const { data, error } = useQuery(GET_ALL_POSTS)

  return (
    <div>
      
    </div>
  )
}

export default Feed
