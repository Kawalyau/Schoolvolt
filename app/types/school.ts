// types/school.ts
import { Timestamp } from 'firebase/firestore';

export interface School {
  id: string;
  name: string;
  level: 'Primary' | 'Secondary' | 'Tertiary' | 'Other';
  schoolType: 'Day' | 'Boarding' | 'Day and Boarding';
  ownership: 'Private' | 'Government' | 'Community' | 'Faith-Based';
  district: string;
  subcounty: string;
  address: string;
  primaryContact: {
    fullName: string;
    position: string;
    phoneNumber: string;
    emailAddress: string;
  };
  adminUids: string[];
  createdBy: string;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}