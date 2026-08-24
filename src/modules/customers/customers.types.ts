export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}
