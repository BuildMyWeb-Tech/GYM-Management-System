// components/admin/BranchInfo.jsx
'use client'
import Image from "next/image"
import { MapPin, Mail, Phone, Globe, Calendar, CheckCircle, Clock, BadgeAlert } from "lucide-react"

const BranchInfo = ({ branch }) => {
    const statusIcons = {
        PENDING:  <Clock size={14} className="text-yellow-600" />,
        ACTIVE:   <CheckCircle size={14} className="text-green-600" />,
        REJECTED: <BadgeAlert size={14} className="text-red-600" />,
    }

    return (
        <div className="flex-1 space-y-3 text-sm">
            <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                <div className="relative">
                    <Image
                        width={100} height={100}
                        src={branch.logo} alt={branch.name}
                        className="w-20 h-20 object-contain bg-white border border-slate-200 shadow-sm rounded-full p-1"
                    />
                    <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                        branch.status === 'PENDING' ? 'bg-yellow-100' :
                        branch.status === 'REJECTED' ? 'bg-red-100' : 'bg-green-100'
                    }`}>
                        {statusIcons[branch.status]}
                    </span>
                </div>

                <div className="text-center sm:text-left">
                    <h3 className="text-xl font-semibold text-slate-800">{branch.name}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2">
                        <span className="text-sm text-slate-500 font-medium">@{branch.username}</span>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            branch.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800'
                            : branch.status === 'REJECTED' ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                            {branch.status}
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mt-4">
                <p className="text-slate-700 text-sm">{branch.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="flex items-center gap-2 text-slate-700">
                    <MapPin size={16} className="text-slate-400" />
                    <span className="text-sm">{branch.address}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                    <Phone size={16} className="text-slate-400" />
                    <span className="text-sm">{branch.phone || branch.contact}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                    <Mail size={16} className="text-slate-400" />
                    <span className="text-sm">{branch.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                    <Globe size={16} className="text-slate-400" />
                    <span className="text-sm">www.{branch.username}.com</span>
                </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
                <Calendar size={16} className="text-slate-400" />
                <p className="text-slate-600 text-sm">
                    Applied on <span className="font-medium">{new Date(branch.createdAt).toLocaleDateString()}</span> by
                </p>
            </div>

            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm mt-2">
                <Image width={36} height={36} src={branch.user.image} alt={branch.user.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                <div>
                    <p className="text-slate-700 font-medium">{branch.user.name}</p>
                    <p className="text-slate-500 text-xs">{branch.user.email}</p>
                </div>
            </div>
        </div>
    )
}

export default BranchInfo