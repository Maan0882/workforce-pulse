import { getNormalizedData } from '@/utils/dataProcessing';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const data = getNormalizedData();
  return <Dashboard initialData={data} />;
}
