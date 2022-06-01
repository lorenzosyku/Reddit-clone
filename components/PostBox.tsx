import { LinkIcon, PhotographIcon } from '@heroicons/react/outline'
import { useSession } from 'next-auth/react'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { gql, useMutation, useQuery } from '@apollo/client'
import client from '../apollo-client'
import toast from 'react-hot-toast'
import { ADD_POST, ADD_SUBREDDIT } from '../graphql/mutations'
import {
  GET_ALL_POSTS,
  GET_SUBREDDITS_WITH_LIMIT,
  GET_SUBREDDIT_BY_TOPIC,
} from '../graphql/queries'
import Avatar from './Avatar'

type FormData = {
  postTitle: string
  postBody: string
  postImage: string
  subreddit: string
}

type Props = {
  subreddit?: string
}

function PostBox({ subreddit }: Props) {
  const { data: session } = useSession()
  const [imageBoxOpen, setImageBoxOpen] = useState(false)
  const [addSubreddit] = useMutation(ADD_SUBREDDIT)
  const [addPost] = useMutation(ADD_POST, {
    refetchQueries: [
      GET_ALL_POSTS,
      'getPostList',
      GET_SUBREDDIT_BY_TOPIC,
      'getPostListByTopic',
      GET_SUBREDDITS_WITH_LIMIT,
      'getSubredditListLimit',
    ],
  })

  const {
    register,
    setValue,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>()

  const onSubmit = handleSubmit(async (formData) => {
    console.log('Fetching subreddit')
    const notification = toast.loading('Creating new Post...')

    try {
      const {
        data: { getSubredditListByTopic },
      } = await client.query({
        query: GET_SUBREDDIT_BY_TOPIC,
        variables: {
          // Use props first, fallback to form
          topic: subreddit || formData.subreddit,
        },
      })

      const subredditExists = getSubredditListByTopic.length > 0
      console.log(
        'Subreddits found with topic: ',
        formData.subreddit,
        getSubredditListByTopic
      )

      if (!subredditExists) {
        console.log('Subreddit is new! -> creating a NEW subreddit!')

        // Create subreddit...
        const {
          data: { insertSubreddit: newSubreddit },
        } = await addSubreddit({
          variables: { topic: formData.subreddit },
        })

        console.log('Creating post...', formData)
        const image = formData.postImage || ''

        const {
          data: { insertPost: newPost },
        } = await addPost({
          variables: {
            body: formData.postBody,
            image: image,
            subreddit_id: newSubreddit.id,
            title: formData.postTitle,
            username: session?.user?.name,
          },
        })

        console.log(newPost)
      } else {
        // Use existing subreddit...
        console.log('Using existing subreddit!')
        console.log(getSubredditListByTopic)

        const image = formData.postImage || ''

        const {
          data: { insertPost: newPost },
        } = await addPost({
          variables: {
            body: formData.postBody,
            image: image,
            subreddit_id: getSubredditListByTopic[0].id,
            title: formData.postTitle,
            username: session?.user?.name,
          },
        })
      }

      setValue('postBody', '')
      setValue('postImage', '')
      setValue('postTitle', '')
      setValue('subreddit', '')

      toast.success('New Post Created!', {
        id: notification,
      })
    } catch (error) {
      toast.error('Whoops something went wrong!', {
        id: notification,
      })
    }
  })

  console.log(subreddit)

  return (
    <form
      onSubmit={onSubmit}
      className="sticky top-16 z-50 rounded-md border border-gray-300 bg-white p-2"
    >
      <div className="flex items-center space-x-3">
        <Avatar />
        <input
          {...register('postTitle', { required: true })}
          disabled={!session}
          className="flex-1 rounded-md bg-gray-50 p-2 pl-5 outline-none "
          type="text"
          placeholder={
            session
              ? subreddit
                ? `Create a Post in r/${subreddit}`
                : 'Create a Post by entering a title...'
              : 'Sign in to Post!'
          }
        />

        <PhotographIcon
          onClick={() => setImageBoxOpen(!imageBoxOpen)}
          className={`h-6 text-gray-300 ${
            imageBoxOpen && 'text-blue-300'
          } cursor-pointer`}
        />
        <LinkIcon className="h-6 text-gray-300" />
      </div>

      {!!watch('postTitle') && (
        <div className="flex flex-col py-2">
          <div className="flex items-center px-2">
            <p className="min-w-[90px]">Body:</p>
            <input
              className="m-2 flex-1 bg-blue-50 p-2 outline-none"
              {...register('postBody')}
              type="text"
              placeholder="Text (optional)"
            />
          </div>

          {!subreddit && (
            <div className="flex items-center px-2">
              <p className="min-w-[90px]">Subreddit:</p>
              <input
                className="m-2 flex-1 bg-blue-50 p-2 outline-none"
                {...register('subreddit', { required: true })}
                type="text"
                placeholder="i.e. Reactjs"
              />
            </div>
          )}

          {imageBoxOpen && (
            <div className="flex items-center px-2">
              <p className="min-w-[90px]">Image URL:</p>
              <input
                className="m-2 flex-1 bg-blue-50 p-2 outline-none"
                {...register('postImage')}
                type="text"
                placeholder="Optional..."
              />
            </div>
          )}
        </div>
      )}

      {/* Errors */}
      {Object.keys(errors).length > 0 && (
        <div className="space-y-2 p-2 text-red-500">
          {errors.postTitle?.type === 'required' && (
            <p>- A Post Title is required</p>
          )}

          {errors.subreddit?.type === 'required' && (
            <p>- A Subreddit is required</p>
          )}
        </div>
      )}

      {!!watch('postTitle') && (
        <button
          className="w-full rounded-full bg-blue-400 p-2 text-white"
          type="submit"
        >
          Create Post
        </button>
      )}
    </form>
  )
}

export default PostBox
