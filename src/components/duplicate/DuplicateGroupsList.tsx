// @ts-nocheck
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DuplicateGroupsListProps {
  groups: any[];
  onReview: (group: any) => void;
}

const DuplicateGroupsList = ({ groups, onReview }: DuplicateGroupsListProps) => {
  if (!groups || groups.length === 0) {
    return (
      <Card>
        <CardContent>
          <p>No duplicate groups found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {groups.map((group) => (
        <Card key={group.id} className="mb-4">
          <CardHeader>
            <CardTitle>Group ID: {group.id}</CardTitle>
            <CardDescription>
              {group.payees.length} Payees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul>
              {group.payees.map((payee) => (
                <li key={payee.id} className="mb-1">
                  {payee.name} <Badge>{payee.method}</Badge>
                </li>
              ))}
            </ul>
            <Button onClick={() => onReview(group)}>Review Group</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DuplicateGroupsList;
