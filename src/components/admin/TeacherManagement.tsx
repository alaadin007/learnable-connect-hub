import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { Loader2, Mail, UserPlus } from 'lucide-react'

interface Teacher {
  id: string
  email: string
  full_name: string
  created_at: string
  is_supervisor: boolean
}

export function TeacherManagement() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const { toast } = useToast()
  const supabase = useSupabaseClient()

  const fetchTeachers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single()

      if (!profile?.school_id) throw new Error('No school associated')

      const { data: teachers, error } = await supabase
        .from('teachers')
        .select(`
          id,
          profiles:profiles (
            email,
            full_name
          ),
          created_at,
          is_supervisor
        `)
        .eq('school_id', profile.school_id)

      if (error) throw error

      setTeachers(teachers.map(t => ({
        id: t.id,
        email: t.profiles.email,
        full_name: t.profiles.full_name,
        created_at: t.created_at,
        is_supervisor: t.is_supervisor
      })))
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch teachers',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInviteTeacher = async () => {
    if (!inviteEmail) return

    setInviting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single()

      if (!profile?.school_id) throw new Error('No school associated')

      const { error } = await supabase
        .from('teacher_invitations')
        .insert({
          school_id: profile.school_id,
          email: inviteEmail,
          invitation_token: crypto.randomUUID(),
          created_by: user.id
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Teacher invitation sent successfully',
      })

      setInviteEmail('')
      fetchTeachers()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive',
      })
    } finally {
      setInviting(false)
    }
  }

  const handleToggleSupervisor = async (teacherId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('teachers')
        .update({ is_supervisor: !currentStatus })
        .eq('id', teacherId)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Teacher ${currentStatus ? 'removed from' : 'promoted to'} supervisor role`,
      })

      fetchTeachers()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update teacher role',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Teacher Management</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Teacher
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a Teacher</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="Teacher's email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Button
                onClick={handleInviteTeacher}
                disabled={inviting || !inviteEmail}
                className="w-full"
              >
                {inviting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Invitation...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((teacher) => (
              <TableRow key={teacher.id}>
                <TableCell>{teacher.full_name}</TableCell>
                <TableCell>{teacher.email}</TableCell>
                <TableCell>
                  {new Date(teacher.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {teacher.is_supervisor ? 'Supervisor' : 'Teacher'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleSupervisor(teacher.id, teacher.is_supervisor)}
                  >
                    {teacher.is_supervisor ? 'Remove Supervisor' : 'Make Supervisor'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
} 