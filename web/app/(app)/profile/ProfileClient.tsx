'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarDays, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import { useUpdateProfile } from '@/lib/queries'
import type { ProfileUpdatePayload, User } from '@/lib/types'

const profileFormSchema = z
  .object({
    username: z.string().min(1, 'Username is required'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((values) => !values.password || values.password.length >= 8, {
    message: 'Password must be at least 8 characters',
    path: ['password'],
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ProfileFormValues = z.infer<typeof profileFormSchema>

function ProfileHeader({ user, children }: { user: User; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-muted-border bg-surface p-6">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-base font-semibold text-brand">
        {user.username.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold text-ink">{user.username}</p>
        <p className="truncate text-sm text-muted-text">{user.email}</p>
      </div>
      {children && <div className="ml-auto shrink-0">{children}</div>}
    </div>
  )
}

function StatTile({ icon: Icon, label, value, first }: { icon: LucideIcon; label: string; value: string; first?: boolean }) {
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-4 p-5 ${first ? '' : 'border-t border-muted-border md:border-l md:border-t-0'}`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted-text">{label}</p>
        <p className="truncate text-lg font-semibold text-ink">{value}</p>
      </div>
    </div>
  )
}

export function ProfileClient() {
  const { user, refreshUser } = useAuth()
  const { showToast } = useToast()
  const updateProfile = useUpdateProfile()
  const [isEditing, setIsEditing] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { username: user?.username ?? '', email: user?.email ?? '', password: '', confirmPassword: '' },
  })

  if (!user) return null

  function startEditing() {
    reset({ username: user!.username, email: user!.email, password: '', confirmPassword: '' })
    setFormError(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setFormError(null)
  }

  const onSubmit = async (values: ProfileFormValues) => {
    setFormError(null)
    const payload: ProfileUpdatePayload = {}
    if (values.username !== user!.username) payload.username = values.username
    if (values.email !== user!.email) payload.email = values.email
    if (values.password) payload.password = values.password

    if (Object.keys(payload).length === 0) {
      setIsEditing(false)
      return
    }

    try {
      await updateProfile.mutateAsync({ id: user!.id, payload })
      const refreshed = await refreshUser()
      if (!refreshed) {
        setFormError('Profile saved, but could not refresh your details. Please reload.')
        return
      }
      showToast('Profile updated')
      setIsEditing(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFormError('Username or email already taken')
      } else {
        setFormError('Something went wrong')
      }
    }
  }

  if (!isEditing) {
    return (
      <main className="flex flex-1 flex-col gap-6 p-6">
        <ProfileHeader user={user}>
          <Button onClick={startEditing}>Edit</Button>
        </ProfileHeader>
        <div className="flex flex-col rounded-2xl border border-muted-border bg-surface md:flex-row">
          <StatTile
            icon={ShieldCheck}
            label="Status"
            value={user.is_active ? 'Active' : 'Inactive'}
            first
          />
          <StatTile icon={CalendarDays} label="Member since" value={formatDate(user.created_at)} />
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <ProfileHeader user={user} />
      <div className="rounded-2xl border border-muted-border bg-surface p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
          <Input
            label="Username"
            type="text"
            autoComplete="username"
            error={errors.username?.message}
            {...register('username')}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          {formError && (
            <p role="alert" className="text-sm text-expense sm:col-span-2">
              {formError}
            </p>
          )}
          <div className="mt-2 flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={cancelEditing}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
