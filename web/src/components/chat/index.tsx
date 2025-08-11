import {
  Bubble,
  Conversations,
  Prompts,
  Sender,
  Suggestion,
  ThoughtChain,
  XProvider,
} from '@ant-design/x'
import { Button, Card, Divider, Flex, Radio, Spin, Typography } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'

import {
  AlipayCircleOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  GithubOutlined,
  LoadingOutlined,
  SmileOutlined,
  StopOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Plus } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useNavigate, useParams } from '@tanstack/react-router'
import type { ConversationsProps } from '@ant-design/x'
import type { ConfigProviderProps, GetProp } from 'antd'
import {
  conversationAdd,
  conversationDelete,
  getConversationList,
} from '@/service/chat'

const Chat = () => {
  const [value, setValue] = React.useState('')

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [keyword, setKeyword] = useState('')

  const {
    data: conversations,
    isFetching: isConversationLoading,
    refetch: conversatonRefetch,
  } = useQuery({
    queryKey: ['conversations', page, limit, keyword],
    queryFn: () => getConversationList(page, limit, keyword),
    initialData: { list: [], total: 0 },
  })
  console.log(conversations)

  const { mutate: handleConversationAdd } = useMutation({
    mutationFn: () => conversationAdd(),
    onSuccess: () => {
      conversatonRefetch()
    },
    onError: (error: any) => {
      toast.error('会话创建失败', {
        description: error.msg || '请稍后重试。',
      })
    },
  })

  const menuConfig: ConversationsProps['menu'] = (conversation) => ({
    items: [
      {
        label: 'Operation 1',
        key: 'operation1',
        icon: <EditOutlined />,
      },
      {
        label: '删除',
        key: 'delete',
        icon: <DeleteOutlined />,
        danger: true,
      },
    ],
    onClick: async (menuInfo) => {
      menuInfo.domEvent.stopPropagation()
      if (menuInfo.key === 'delete') {
        await conversationDelete(conversation.key)
        await conversatonRefetch()
      }
    },
  })

  const [activeKey, setActiveKey] = useState('')

  const { conversationId } = useParams({ strict: false })
  const navigate = useNavigate()

  const handleSelectConversation = useCallback(
    (convId: string) => {
      setActiveKey(convId)
      navigate({
        to: '/chat/$conversationId',
        params: {
          conversationId: convId,
        },
      })
    },
    [navigate],
  )

  useEffect(() => {
    if (conversationId) {
      handleSelectConversation(conversationId)
    }
  }, [conversationId])

  return (
    <>
      <Card>
        <XProvider direction="ltr">
          <Flex style={{ height: '90vh' }} gap={12}>
            <Flex vertical gap={8}>
              <Button onClick={() => handleConversationAdd()}>
                <Plus />
                新聊天
              </Button>
              {isConversationLoading ? (
                <Spin />
              ) : (
                <Conversations
                  menu={menuConfig}
                  style={{ width: 200 }}
                  activeKey={activeKey}
                  onActiveChange={(key: string) =>
                    handleSelectConversation(key)
                  }
                  items={conversations.list?.map((item: any) => ({
                    key: item.id,
                    label: item.title,
                  }))}
                />
              )}
            </Flex>
            <Divider type="vertical" style={{ height: '100%' }} />
            <Flex vertical style={{ flex: 1 }} gap={8}>
              <Bubble.List
                style={{ flex: 1 }}
                items={[
                  {
                    key: '1',
                    placement: 'end',
                    content: 'Hello Ant Design X!',
                    avatar: { icon: <UserOutlined /> },
                  },
                  {
                    key: '2',
                    content: 'Hello World!',
                  },
                  {
                    key: '2',
                    content: '',
                    loading: true,
                  },
                ]}
              />
              <Prompts
                items={[
                  {
                    key: '1',
                    icon: <BulbOutlined style={{ color: '#FFD700' }} />,
                    label: 'Ignite Your Creativity',
                  },
                  {
                    key: '2',
                    icon: <SmileOutlined style={{ color: '#52C41A' }} />,
                    label: 'Tell me a Joke',
                  },
                ]}
              />
              <Suggestion
                items={[{ label: 'Write a report', value: 'report' }]}
              >
                {({ onTrigger, onKeyDown }) => {
                  return (
                    <Sender
                      value={value}
                      onChange={(nextVal) => {
                        if (nextVal === '/') {
                          onTrigger()
                        } else if (!nextVal) {
                          onTrigger(false)
                        }
                        setValue(nextVal)
                      }}
                      onKeyDown={onKeyDown}
                      placeholder='Type "/" to trigger suggestion'
                    />
                  )
                }}
              </Suggestion>
            </Flex>
          </Flex>
        </XProvider>
      </Card>
    </>
  )
}

export default Chat
