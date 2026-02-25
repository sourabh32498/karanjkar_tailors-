import { useEffect, useState } from "react";
import api, { getApiError } from "../api";

const DRESS_TYPES = ["Shirt", "Pant", "Suit", "Kurta", "Sherwani", "Blazer", "Waistcoat"];
const PAYMENT_MODES = ["Cash", "UPI", "Card", "Bank Transfer"];
const ORDER_STATUSES = ["Pending", "Trial Scheduled", "Ready for Pickup", "Delivered", "Other"];

function Orders() {
  const [form, setForm] = useState({
    customer_id: "",
    manual_customer_id: "",
    use_manual_customer: false,
    dress_type: "",
    price: "",
    paid_amount: "",
    trial_date: "",
    payment_mode: "",
    payment_date: "",
    delivery_date: "",
    status: "Pending",
    other_status: ""
  });
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    customer_id: "",
    dress_type: "",
    price: "",
    paid_amount: "",
    trial_date: "",
    payment_mode: "",
    payment_date: "",
    delivery_date: "",
    status: "Pending"
  });

  const loadCustomers = async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data || []);
    } catch (_err) {
      setCustomers([]);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await api.get("/orders");
      setOrders(res.data);
      setError("");
    } catch (err) {
      setError(getApiError(err, "Failed to load orders"));
    }
  };

  useEffect(() => {
    loadCustomers();
    loadOrders();
  }, []);

  const getCustomerName = (id) => {
    const found = customers.find((c) => Number(c.id) === Number(id));
    return found ? found.name : `ID ${id}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const resolvedCustomerId = form.use_manual_customer ? form.manual_customer_id : form.customer_id;
    const numericCustomerId = Number(resolvedCustomerId);

    if (!resolvedCustomerId || !form.dress_type || !form.price || !form.delivery_date) {
      alert("Customer ID, dress type, price and delivery date are required");
      return;
    }
    if (!numericCustomerId || Number.isNaN(numericCustomerId)) {
      alert("Customer ID must be a valid number");
      return;
    }
    if (customers.length > 0 && !customers.some((c) => Number(c.id) === numericCustomerId)) {
      alert(`Customer ID ${numericCustomerId} not found. Please add customer first.`);
      return;
    }
    if (Number(form.paid_amount || 0) > Number(form.price || 0)) {
      alert("Paid amount cannot be greater than price");
      return;
    }
    if (form.status === "Other" && !form.other_status.trim()) {
      alert("Please enter a custom status");
      return;
    }

    const payload = {
      customer_id: numericCustomerId,
      dress_type: form.dress_type,
      price: form.price,
      paid_amount: Number(form.paid_amount || 0),
      trial_date: form.trial_date || null,
      payment_mode: form.payment_mode || null,
      payment_date: form.payment_date || null,
      delivery_date: form.delivery_date,
      status: form.status === "Other" ? form.other_status.trim() : form.status
    };

    try {
      await api.post("/orders", payload);
      alert("Order Added");
      setForm({
        customer_id: "",
        manual_customer_id: "",
        use_manual_customer: false,
        dress_type: "",
        price: "",
        paid_amount: "",
        trial_date: "",
        payment_mode: "",
        payment_date: "",
        delivery_date: "",
        status: "Pending",
        other_status: ""
      });
      loadOrders();
    } catch (err) {
      const status = err?.response?.status;
      const composed = getApiError(err, "Failed to add order");
      alert(status ? `(${status}) ${composed}` : composed);
    }
  };

  const startEdit = (order) => {
    setEditingId(order.id);
    setEditForm({
      customer_id: String(order.customer_id || ""),
      dress_type: order.dress_type || "",
      price: String(order.price ?? ""),
      paid_amount: String(order.paid_amount ?? "0"),
      trial_date: order.trial_date ? String(order.trial_date).slice(0, 10) : "",
      payment_mode: order.payment_mode || "",
      payment_date: order.payment_date ? String(order.payment_date).slice(0, 10) : "",
      delivery_date: order.delivery_date ? String(order.delivery_date).slice(0, 10) : "",
      status: order.status || "Pending"
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      customer_id: "",
      dress_type: "",
      price: "",
      paid_amount: "",
      trial_date: "",
      payment_mode: "",
      payment_date: "",
      delivery_date: "",
      status: "Pending"
    });
  };

  const updateOrder = async (id) => {
    if (!editForm.customer_id || !editForm.dress_type || !editForm.price || !editForm.delivery_date) {
      alert("Customer, dress type, price and delivery date are required");
      return;
    }
    if (Number(editForm.paid_amount || 0) > Number(editForm.price || 0)) {
      alert("Paid amount cannot be greater than price");
      return;
    }

    try {
      await api.put(`/orders/${id}`, {
        customer_id: Number(editForm.customer_id),
        dress_type: editForm.dress_type,
        price: Number(editForm.price),
        paid_amount: Number(editForm.paid_amount || 0),
        trial_date: editForm.trial_date || null,
        payment_mode: editForm.payment_mode || null,
        payment_date: editForm.payment_date || null,
        delivery_date: editForm.delivery_date,
        status: editForm.status || "Pending"
      });
      alert("Order Updated");
      cancelEdit();
      loadOrders();
    } catch (err) {
      alert(getApiError(err, "Failed to update order"));
    }
  };

  const deleteOrder = async (id) => {
    if (!window.confirm("Delete this order?")) {
      return;
    }
    try {
      await api.delete(`/orders/${id}`);
      if (editingId === id) {
        cancelEdit();
      }
      loadOrders();
    } catch (err) {
      alert(getApiError(err, "Failed to delete order"));
    }
  };

  return (
    <div className="card section-card shadow-sm mt-4">
      <div className="card-body">
        <h5 className="card-title mb-3">Add Order</h5>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <form className="row g-3 mb-4" onSubmit={handleSubmit}>
          <div className="col-md-3">
            <label className="form-label">Customer Mode</label>
            <select
              className="form-select"
              value={form.use_manual_customer ? "manual" : "list"}
              onChange={(e) =>
                setForm({
                  ...form,
                  use_manual_customer: e.target.value === "manual",
                  customer_id: "",
                  manual_customer_id: ""
                })
              }
            >
              <option value="list">Select Existing Customer</option>
              <option value="manual">Enter Customer ID Manually</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Customer Name</label>
            {!form.use_manual_customer ? (
              <select
                className="form-select"
                value={form.customer_id}
                onFocus={loadCustomers}
                onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
              >
                <option value="">Select customer name</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (ID: {c.id})
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="form-control"
                placeholder="Enter customer ID"
                value={form.manual_customer_id}
                onChange={(e) => setForm({ ...form, manual_customer_id: e.target.value })}
              />
            )}
          </div>
          {!form.use_manual_customer && (
            <div className="col-md-3 d-flex align-items-end">
              <button type="button" className="btn btn-outline-secondary w-100" onClick={loadCustomers}>
                Refresh Customers
              </button>
            </div>
          )}
          <div className="col-md-3">
            <label className="form-label">Dress Type</label>
            <select
              className="form-select"
              value={form.dress_type}
              onChange={(e) => setForm({ ...form, dress_type: e.target.value })}
            >
              <option value="">Select dress type</option>
              {DRESS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Price</label>
            <input
              className="form-control"
              placeholder="Order price"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Paid Amount</label>
            <input
              className="form-control"
              placeholder="Received now"
              value={form.paid_amount}
              onChange={(e) => setForm({ ...form, paid_amount: e.target.value })}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Trial Date</label>
            <input
              className="form-control"
              type="date"
              value={form.trial_date}
              onChange={(e) => setForm({ ...form, trial_date: e.target.value })}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Payment Mode</label>
            <select
              className="form-select"
              value={form.payment_mode}
              onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
            >
              <option value="">Select mode</option>
              {PAYMENT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Payment Date</label>
            <input
              className="form-control"
              type="date"
              value={form.payment_date}
              onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Delivery Date</label>
            <input
              className="form-control"
              type="date"
              value={form.delivery_date}
              onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          {form.status === "Other" && (
            <div className="col-md-3">
              <label className="form-label">Other Status</label>
              <input
                className="form-control"
                placeholder="Enter status"
                value={form.other_status}
                onChange={(e) => setForm({ ...form, other_status: e.target.value })}
              />
            </div>
          )}
          <div className="col-12">
            <button type="submit" className="btn btn-primary px-4">
              Add Order
            </button>
          </div>
        </form>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Customer Name</th>
                <th>Dress Type</th>
                <th>Price</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Pay Mode</th>
                <th>Trial Date</th>
                <th>Delivery Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>
                    {editingId === o.id ? (
                      <select
                        className="form-select form-select-sm"
                        value={editForm.customer_id}
                        onChange={(e) => setEditForm({ ...editForm, customer_id: e.target.value })}
                      >
                        <option value="">Select customer</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (ID: {c.id})
                          </option>
                        ))}
                      </select>
                    ) : (
                      o.customer_name || getCustomerName(o.customer_id)
                    )}
                  </td>
                  <td>
                    {editingId === o.id ? (
                      <select
                        className="form-select form-select-sm"
                        value={editForm.dress_type}
                        onChange={(e) => setEditForm({ ...editForm, dress_type: e.target.value })}
                      >
                        <option value="">Select dress type</option>
                        {DRESS_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    ) : (
                      o.dress_type || o.order_type || ""
                    )}
                  </td>
                  <td>
                    {editingId === o.id ? (
                      <input
                        className="form-control form-control-sm"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      />
                    ) : (
                      o.price ?? o.amount ?? ""
                    )}
                  </td>
                  <td>
                    {editingId === o.id ? (
                      <input
                        className="form-control form-control-sm"
                        value={editForm.paid_amount}
                        onChange={(e) => setEditForm({ ...editForm, paid_amount: e.target.value })}
                      />
                    ) : (
                      Number(o.paid_amount || 0).toFixed(2)
                    )}
                  </td>
                  <td>{Number(o.due_amount ?? Number(o.price || 0) - Number(o.paid_amount || 0)).toFixed(2)}</td>
                  <td>
                    {editingId === o.id ? (
                      <select
                        className="form-select form-select-sm"
                        value={editForm.payment_mode}
                        onChange={(e) => setEditForm({ ...editForm, payment_mode: e.target.value })}
                      >
                        <option value="">Select mode</option>
                        {PAYMENT_MODES.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                    ) : (
                      o.payment_mode || "-"
                    )}
                  </td>
                  <td>
                    {editingId === o.id ? (
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={editForm.trial_date}
                        onChange={(e) => setEditForm({ ...editForm, trial_date: e.target.value })}
                      />
                    ) : (
                      o.trial_date ? String(o.trial_date).slice(0, 10) : "-"
                    )}
                  </td>
                  <td>
                    {editingId === o.id ? (
                      <div className="d-flex flex-column gap-1">
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={editForm.delivery_date}
                          onChange={(e) => setEditForm({ ...editForm, delivery_date: e.target.value })}
                        />
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={editForm.payment_date}
                          onChange={(e) => setEditForm({ ...editForm, payment_date: e.target.value })}
                        />
                      </div>
                    ) : (
                      <>
                        <div>{o.delivery_date ? String(o.delivery_date).slice(0, 10) : ""}</div>
                        <small className="text-muted">
                          Paid: {o.payment_date ? String(o.payment_date).slice(0, 10) : "-"}
                        </small>
                      </>
                    )}
                  </td>
                  <td>
                    {editingId === o.id ? (
                      <select
                        className="form-select form-select-sm"
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`badge ${o.status === "Delivered" ? "text-bg-success" : "text-bg-warning"}`}>
                        {o.status || "Pending"}
                      </span>
                    )}
                  </td>
                  <td className="text-nowrap">
                    {editingId === o.id ? (
                      <>
                        <button type="button" className="btn btn-sm btn-success me-2" onClick={() => updateOrder(o.id)}>
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
                          onClick={() => startEdit(o)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => deleteOrder(o.id)}
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

export default Orders;


