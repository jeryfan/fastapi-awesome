import {
  Bubble,
  Prompts,
  Sender,
  Suggestion,
  ThoughtChain,
  XProvider,
  XStream,
  useXAgent,
  useXChat,
} from '@ant-design/x'
import { Button, Card, Divider, Flex, Radio, Spin, Typography } from 'antd'
import React, { useState } from 'react'

import { BulbOutlined, SmileOutlined, UserOutlined } from '@ant-design/icons'
import markdownit from 'markdown-it'
import { useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import Conversation from './conversation'
import type { BubbleProps } from '@ant-design/x'
import type { GetProp } from 'antd'
import { chatCompletion, getConversationMessages } from '@/service/chat'

const md = markdownit({ html: true, breaks: true })
const renderMarkdown: BubbleProps['messageRender'] = (content) => {
  console.log('content', content)

  return (
    <Typography>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: used in demo */}
      <div dangerouslySetInnerHTML={{ __html: md.render(content) }} />
    </Typography>
  )
}
const roles: GetProp<typeof Bubble.List, 'roles'> = {
  assistant: {
    placement: 'start',
    avatar: { icon: <UserOutlined />, style: { background: '#fde3cf' } },
  },
  user: {
    placement: 'end',
    avatar: { icon: <UserOutlined />, style: { background: '#87d068' } },
  },
}

const Chat = () => {
  const [inputValue, setInputValue] = useState('')

  const { conversationId } = useParams({ strict: false })

  const [agent] = useXAgent<string, { message: string }, string>({
    request: async ({ message }, { onSuccess, onUpdate }) => {
      const response = await chatCompletion(conversationId as string, {
        messages: [{ role: 'user', content: message }],
        conversation_id: conversationId,
      })
      let fullContent = ''
      for await (const chunk of XStream({
        readableStream: response.body,
      })) {
        const data = chunk.data
        if (data.includes('DONE')) {
          onSuccess([fullContent])
        } else {
          const jsonData = JSON.parse(data)
          const content = jsonData.choices[0].delta.content || ''
          fullContent += content
          onUpdate(fullContent)
        }
      }
    },
  })

  // Chat messages
  const { onRequest, messages } = useXChat({
    agent,
  })

  const { data: messageHistory } = useQuery({
    queryKey: ['messages'],
    queryFn: () => getConversationMessages(conversationId as string),
    enabled: !!conversationId,
  })

  console.log('messageHistory', messageHistory)

  return (
    <>
      <Card>
        <XProvider direction="ltr">
          <Flex style={{ height: '90vh' }} gap={12}>
            <Conversation />
            <Divider type="vertical" style={{ height: '100%' }} />
            <Flex vertical style={{ flex: 1 }} gap={8}>
              <Bubble.List
                roles={roles}
                style={{ flex: 1 }}
                items={messages.map(({ id, message, status }) => {
                  console.log('message', message)

                  return {
                    key: id,
                    role: status === 'local' ? 'user' : 'assistant',
                    content: renderMarkdown(message || ''),
                  }
                })}
              />

              <Sender
                value={inputValue}
                loading={agent.isRequesting()}
                onChange={(nextVal) => {
                  setInputValue(nextVal)
                }}
                placeholder=""
                onSubmit={(val) => {
                  onRequest(val)
                }}
              />
            </Flex>
          </Flex>
        </XProvider>
      </Card>
    </>
  )
}

export default Chat
