
import AdminTablePagination from "../../../../../components/ui/pagination/AdminTablePagination";

export default function UserTablePagination({ isLoading, meta, setPage, limit, setLimit }) {
  return (
    <AdminTablePagination
      page={meta?.page || 1}
      totalPages={meta?.totalPages || 1}
      total={meta?.total || 0}
      limit={limit}
      onPageChange={setPage}
      onLimitChange={(newLimit) => {
        setLimit?.(newLimit);
        setPage?.(1);
      }}
      isLoading={isLoading}
      itemName="users"
      sticky={true}
      className="rounded-b-2xl"
    />
  );
}
