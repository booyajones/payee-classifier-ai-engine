
import ConfirmationDialog from '../ConfirmationDialog';

interface BatchJobConfirmationProps {
  isOpen: boolean;
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
}

const BatchJobConfirmation = ({
  isOpen,
  title,
  description,
  variant = 'default',
  onConfirm,
  onCancel
}: BatchJobConfirmationProps) => {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onOpenChange={onCancel}
      title={title}
      description={description}
      onConfirm={onConfirm}
      variant={variant}
      confirmText={variant === 'destructive' ? 'Remove' : 'Continue'}
    />
  );
};

export default BatchJobConfirmation;
