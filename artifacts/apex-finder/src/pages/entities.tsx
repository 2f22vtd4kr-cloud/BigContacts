import { useState } from "react";
import { useListEntities, useCreateEntity, useDeleteEntity } from "@workspace/api-client-react";
import { formatCurrency, ScoreBadge } from "@/lib/utils";
import { Plus, Search, Trash2, Edit2, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

export default function EntityLedger() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: entities, refetch } = useListEntities({ search: searchTerm.length > 2 ? searchTerm : undefined });
  const deleteEntity = useDeleteEntity();

  const handleDelete = (id: number) => {
    if (confirm("Purge entity from registry?")) {
      deleteEntity.mutate({ id }, { onSuccess: () => refetch() });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-6 border-b border-border bg-card flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-widest text-foreground uppercase">Entity Ledger</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">Classified Intelligence Registry</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search registry..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-background border border-border rounded pl-9 pr-4 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary w-64"
            />
          </div>
          
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded font-mono text-sm flex items-center hover:bg-primary/90 transition-colors uppercase tracking-wider">
            <Plus className="w-4 h-4 mr-2" /> Add Entity
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="border border-border rounded bg-card overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 font-mono border-b border-border">
              <tr>
                <th className="px-6 py-4">Name / ID</th>
                <th className="px-6 py-4">Classification</th>
                <th className="px-6 py-4">Signal Score</th>
                <th className="px-6 py-4">Net Worth</th>
                <th className="px-6 py-4">Assets</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              {entities?.map((entity) => (
                <tr key={entity.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {entity.isHot && <ShieldAlert className="w-4 h-4 text-amber-500 mr-2 animate-pulse" />}
                      <div>
                        <div className="font-bold text-foreground">{entity.name}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-1">ID: #{entity.id.toString().padStart(6, '0')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-muted px-2 py-1 rounded text-xs font-mono text-muted-foreground border border-border">
                      {entity.type}
                    </span>
                    {entity.nationality && (
                      <span className="ml-2 text-xs text-muted-foreground">{entity.nationality}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <ScoreBadge score={entity.bayesianScore} />
                  </td>
                  <td className="px-6 py-4 text-foreground font-mono">
                    {formatCurrency(entity.estimatedNetWorth)}
                  </td>
                  <td className="px-6 py-4 text-foreground font-mono">
                    {entity.assetCount}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-muted-foreground hover:text-secondary bg-muted rounded border border-border">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(entity.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive bg-muted rounded border border-border"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {(!entities || entities.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-mono">
                    No entities found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
