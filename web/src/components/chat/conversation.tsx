import { Conversations } from '@ant-design/x'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from '@tanstack/react-router'
import { Button, Flex, Spin } from 'antd'
import { Plus } from 'lucide-react'
import type { ConversationsProps } from '@ant-design/x'
import {
  conversationAdd,
  conversationDelete,
  getConversationList,
} from '@/service/chat'

const Conversation = () => {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
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
          onActiveChange={(key: string) => handleSelectConversation(key)}
          items={conversations.list?.map((item: any) => ({
            key: item.id,
            label: item.title,
          }))}
        />
      )}
    </Flex>
  )
}

export default Conversation
