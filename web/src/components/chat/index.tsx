import {
  Attachments,
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
import {
  Button,
  Card,
  Divider,
  Flex,
  Image,
  Radio,
  Spin,
  Switch,
  Typography,
} from 'antd'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import {
  ApiOutlined,
  BulbOutlined,
  CloudUploadOutlined,
  LinkOutlined,
  SearchOutlined,
  SmileOutlined,
  UserOutlined,
} from '@ant-design/icons'
import markdownit from 'markdown-it'
import { useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import Conversation from './conversation'
import styles from './index.module.css'
import type { AttachmentsProps, BubbleProps } from '@ant-design/x'
import type { GetProp, GetRef } from 'antd'
import { chatCompletion, getConversationMessages } from '@/service/chat'
import { uploadFile } from '@/service/file'

const md = markdownit({ html: true, breaks: true })
const renderMarkdown: BubbleProps['messageRender'] = (content: any) => {
  console.log('content', content)
  if (typeof content === 'string') {
    return (
      <Typography>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: used in demo */}
        <div dangerouslySetInnerHTML={{ __html: md.render(content) }} />
      </Typography>
    )
  } else {
    return (
      <Typography>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: used in demo */}
        {content.map((item: any) => {
          if (item.type === 'image_url') {
            return <Image height={50} src={item.image_url.url} />
          } else {
            return <Typography.Paragraph>{item.text}</Typography.Paragraph>
          }
        })}
        {/* <div dangerouslySetInnerHTML={{ __html: md.render(content) }} /> */}
      </Typography>
    )
  }
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

  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<GetProp<AttachmentsProps, 'items'>>(
    [],
  )
  const uploadRef = useRef(null)
  const attachmentsRef = React.useRef<GetRef<typeof Attachments>>(null)
  const senderRef = React.useRef<GetRef<typeof Sender>>(null)

  const [agent] = useXAgent<string, { message: any }, string>({
    request: async ({ message }, { onSuccess, onUpdate }) => {
      const response = await chatCompletion(conversationId as string, {
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
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

  const loading = agent.isRequesting()

  const {
    data: messageHistory,
    isLoading,
    isSuccess,
  } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => getConversationMessages(conversationId as string),
    enabled: !!conversationId,
  })

  const isHistoryLoaded = useRef(false)

  const { onRequest, messages, setMessages } = useXChat({
    agent,
  })

  useEffect(() => {
    if (isSuccess && messageHistory?.messages) {
      const historyMessages = messageHistory.messages.map((msg) => ({
        id: msg.id,
        status: msg.role === 'user' ? 'local' : 'ai',
        message: msg.content,
      }))

      setMessages(historyMessages)
      isHistoryLoaded.current = true
    }
  }, [isSuccess, messageHistory, setMessages, conversationId])

  if (isLoading) {
    return <Spin fullscreen tip="正在加载历史消息..." />
  }

  const iconStyle = {
    fontSize: 18,
  }

  const senderHeader = (
    <Sender.Header
      className="!border-b-[0px]"
      title=""
      styles={{
        header: {
          display: 'none',
        },
        content: {
          padding: 0,
        },
      }}
      open={open}
      onOpenChange={setOpen}
      forceRender
    >
      <Attachments
        ref={attachmentsRef}
        beforeUpload={() => true}
        items={items}
        multiple
        action={async (file) => {
          const res = await uploadFile(file, (progress) => {
            console.log('上传进度:', progress)
          })
          // return res.data.file_url
          return 'http://localhost:3000/background.png'
        }}
        onChange={({ fileList }) => {
          if (!open) {
            setOpen(true)
          }
          setItems(fileList)
          if (!fileList.length) {
            setOpen(false)
          }
        }}
        placeholder={(_) => <div ref={uploadRef}></div>}
        // getDropContainer={() => senderRef.current?.nativeElement}
      />
    </Sender.Header>
  )

  return (
    <>
      <Card>
        <XProvider direction="ltr">
          <Flex style={{ height: '90vh' }} gap={12}>
            <Conversation />
            <Divider type="vertical" style={{ height: '100%' }} />
            <Flex
              vertical
              style={{ flex: 1 }}
              gap={8}
              className="no-focus-style"
            >
              <Bubble.List
                roles={roles}
                style={{ flex: 1 }}
                items={messages.map(({ id, message, status }) => {
                  console.log('message', id, status, message)

                  return {
                    key: id,
                    role: status === 'local' ? 'user' : 'assistant',
                    content: renderMarkdown(message || ''),
                  }
                })}
              />

              <Sender
                header={senderHeader}
                value={inputValue}
                onChange={(nextVal) => {
                  setInputValue(nextVal)
                }}
                rootClassName={`no-focus-style`}
                onSubmit={(val) => {
                  if (items.length === 0) {
                    onRequest(val)
                    return
                  }

                  onRequest([
                    {
                      type: 'text',
                      text: val,
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: 'https://kkimgs.yisou.com/ims?f=webp&kt=url&at=smstruct&key=aHR0cDovL3AwLnFobXNnLmNvbS90MDEyNThhM2NlNzhkMzNmODQyLmpwZw==&sign=yx:j7HDOuZKw3GOh7i8YRLq1hO8iIY=&tv=400_400',
                      },
                    },
                  ])
                  setInputValue('')
                }}
                actions={false}
                footer={({ components }) => {
                  const { SendButton, LoadingButton, SpeechButton } = components
                  return (
                    <Flex justify="space-between" align="center">
                      <Flex gap="small" align="center">
                        <Button
                          style={iconStyle}
                          type="text"
                          icon={<LinkOutlined />}
                          onClick={() => {
                            if (!open) {
                              uploadRef.current?.click()
                            }
                          }}
                        />
                        <Divider type="vertical" />
                        <Button variant="link" className="border-none">
                          图片
                        </Button>
                      </Flex>
                      <Flex align="center">
                        <SpeechButton style={iconStyle} />
                        <Divider type="vertical" />
                        {loading ? (
                          <LoadingButton type="default" />
                        ) : (
                          <SendButton type="primary" disabled={false} />
                        )}
                      </Flex>
                    </Flex>
                  )
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
