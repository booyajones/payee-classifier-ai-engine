// @ts-nocheck
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DuplicateGroup } from '@/lib/duplicateDetection';
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Link } from "lucide-react"
import { useNavigate } from 'react-router-dom';

interface DuplicateDetectionResultsProps {
  duplicateGroups: DuplicateGroup[];
}

const DuplicateDetectionResults = ({ duplicateGroups }: DuplicateDetectionResultsProps) => {
  const navigate = useNavigate();

  if (!duplicateGroups || duplicateGroups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Duplicate Groups Found</CardTitle>
          <CardDescription>No duplicate groups were detected based on the current settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Adjust the duplicate detection settings and try again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Duplicate Detection Results</CardTitle>
        <CardDescription>
          {duplicateGroups.length} duplicate groups were detected. Review and merge as needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Payees</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {duplicateGroups.map((group, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {group.payees.map((payee, i) => (
                        <Avatar key={i} className="h-6 w-6">
                          <AvatarImage src={`https://avatar.vercel.sh/${payee.name}.png`} alt={payee.name} />
                          <AvatarFallback>{payee.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      ))}
                      <span>{group.payees.length} Payees</span>
                    </div>
                  </TableCell>
                  <TableCell>{group.method}</TableCell>
                  <TableCell>{group.score.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/duplicate-review/${index}`)}>
                      Review & Merge <Link className="ml-2 h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default DuplicateDetectionResults;
