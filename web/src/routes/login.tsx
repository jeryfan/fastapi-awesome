import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Eye, EyeOff } from 'lucide-react'

import { login, loginSchema } from '../service/auth'
import type { LoginPayload } from '../service/auth'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/login')({
  component: LoginComponent,
})

function LoginComponent() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginPayload>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      toast.success('登录成功！')
      navigate({ to: '/' })
    },
    onError: (error: any) => {
      toast.error('登录失败', {
        description: error.message || '请检查您的邮箱和密码。',
      })
    },
  })

  function onSubmit(values: LoginPayload) {
    loginMutation.mutate(values)
  }

  const handleGithubLogin = () => {
    // Redirect to backend's GitHub OAuth initiation endpoint
    window.location.href = `${import.meta.env.VITE_API_PREFIX}/oauth/authorize/github`
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="hidden bg-muted lg:block">
        <img
          src="/background.png"
          alt="Image"
          width="1920"
          height="1080"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">登录</h1>
            <p className="text-balance text-muted-foreground">
              输入您的电子邮件以登录您的帐户
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>邮箱</FormLabel>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center">
                      <FormLabel htmlFor="password">密码</FormLabel>
                      <Link
                        to="/login"
                        className="ml-auto inline-block text-sm underline"
                      >
                        忘记密码?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center pr-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? '登录中...' : '登录'}
              </Button>
              <Button variant="outline" className="w-full" onClick={handleGithubLogin}>
                使用Github登录
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            还没有账户?{' '}
            <Link to="/register" className="underline">
              注册
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
