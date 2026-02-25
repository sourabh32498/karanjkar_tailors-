import { useEffect, useState } from "react";
import api, { getApiError } from "../api";

function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "" });

  const loadCustomers = async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
      setError("");
    } catch (err) {
      setError(getApiError(err, "Failed to load customers"));
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const startEdit = (customer) => {
    setEditingId(customer.id);
    setEditForm({
      name: customer.name || "",
      phone: customer.phone || "",
      address: customer.address || ""
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", phone: "", address: "" });
  };

  const updateCustomer = async (id) => {
    if (!editForm.name || !editForm.phone || !editForm.address) {
      alert("Name, phone and address are required");
      return;
    }
    try {
      await api.put(`/customers/${id}`, editForm);
      alert("Customer Updated");
      cancelEdit();
      loadCustomers();
    } catch (err) {
      alert(getApiError(err, "Failed to update customer"));
    }
  };

  const deleteCustomer = async (id) => {
    if (!window.confirm("Delete this customer?")) {
      return;
    }
    try {
      await api.delete(`/customers/${id}`);
      if (editingId === id) {
        cancelEdit();
      }
      loadCustomers();
    } catch (err) {
      alert(getApiError(err, "Failed to delete customer"));
    }
  };

  return (
    <div className="card section-card shadow-sm">
      <div className="card-body">
        <h5 className="card-title mb-3">Customer List</h5>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td>
                    {editingId === c.id ? (
                      <input
                        className="form-control form-control-sm"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    ) : (
                      c.name
                    )}
                  </td>
                  <td>
                    {editingId === c.id ? (
                      <input
                        className="form-control form-control-sm"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    ) : (
                      c.phone
                    )}
                  </td>
                  <td>
                    {editingId === c.id ? (
                      <input
                        className="form-control form-control-sm"
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      />
                    ) : (
                      c.address
                    )}
                  </td>
                  <td className="text-nowrap">
                    {editingId === c.id ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-success me-2"
                          onClick={() => updateCustomer(c.id)}
                        >
                          Save
                        </button>
                        <button type="button" className="btn btn-sm btn-secondary" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => startEdit(c)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => deleteCustomer(c.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CustomerList;
