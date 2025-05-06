import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// Add these utility functions at the top of the file if they don't exist
const isStudentRecord = (data: any): data is { id: string; school_id: string; status: string; created_at: string } => {
  return (
    data &&
    typeof data === 'object' &&
    'id' in data &&
    'school_id' in data &&
    'status' in data &&
    'created_at' in data
  );
};

const isProfileRecord = (data: any): data is { id: string; full_name: string } => {
  return (
    data &&
    typeof data === 'object' &&
    'id' in data &&
    'full_name' in data
  );
};

const AdminStudents = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  // Inside the component, update the fetchStudents function
  const fetchStudents = async () => {
    setLoading(true);
    try {
      // Get school ID for the current user
      const { data: schoolData, error: schoolError } = await supabase
        .rpc('get_user_school_id');
    
      if (schoolError) {
        console.error('Error fetching school ID:', schoolError);
        toast.error('Failed to load school information');
        setLoading(false);
        return;
      }
    
      if (!schoolData) {
        console.error('No school ID found');
        setLoading(false);
        return;
      }
    
      setSchoolId(schoolData);
    
      // Get all students for this school
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolData);

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        toast.error('Failed to load students');
        setLoading(false);
        return;
      }

      // Filter out any records that don't match our expected structure
      const validStudents = Array.isArray(studentsData) 
        ? studentsData.filter(isStudentRecord)
        : [];
    
      setStudents(validStudents);
    
      // Get profiles for these students to get their names
      if (validStudents.length > 0) {
        const studentIds = validStudents.map(s => s.id);
      
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', studentIds);
      
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        } else if (profilesData) {
          // Filter and convert to our expected format
          const validProfiles: { id: string; full_name: string }[] = Array.isArray(profilesData)
            ? profilesData.filter(isProfileRecord)
            : [];
        
        setProfiles(validProfiles);
      }
    }
  } catch (error) {
    console.error('Error in fetchStudents:', error);
    toast.error('An error occurred while fetching student data');
  } finally {
    setLoading(false);
  }
};

// Update the handleApproveStudent function to properly type the update
const handleApproveStudent = async (student: any) => {
  if (!isStudentRecord(student)) {
    console.error('Invalid student record');
    return;
  }
  
  try {
    const { error } = await supabase
      .from('students')
      .update({ status: 'active' })
      .eq('id', student.id);
    
    if (error) {
      console.error('Error updating student status:', error);
      toast.error('Failed to approve student');
      return;
    }
    
    // Update local state
    setStudents(prevStudents => 
      prevStudents.map(s => 
        s.id === student.id ? { ...s, status: 'active' } : s
      )
    );
    
    toast.success('Student approved successfully');
  } catch (error) {
    console.error('Error in handleApproveStudent:', error);
    toast.error('An error occurred while approving the student');
  }
};

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Students</CardTitle>
        <CardDescription>Manage students in your school</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 bg-gray-50"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => {
                  const profile = profiles.find((p) => p.id === student.id);
                  return (
                    <tr key={student.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{profile?.full_name || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{student.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm leading-5">
                        {student.status !== 'active' && (
                          <Button onClick={() => handleApproveStudent(student)} variant="outline">
                            Approve
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminStudents;
